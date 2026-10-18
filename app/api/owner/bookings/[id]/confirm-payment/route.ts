import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedOwner } from "@/lib/auth";
import { BookingStatus, NotificationType, PaymentStatus } from "@prisma/client";
import { createNotification } from "@/lib/notification-service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isForbidden } = await getAuthenticatedOwner(request);

    if (isForbidden) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. Owner or Admin privileges required." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const method = body?.method || "MANUAL_CASH";
    const reference = body?.reference?.trim() || "";
    const notes = body?.notes?.trim() || "Payment received and verified by venue owner";

    // Verify booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: { include: { venue: true } },
        payments: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    if (user.role !== "ADMIN" && booking.court.venue.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: "Access denied. You do not own the venue for this booking." },
        { status: 403 }
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        { success: false, message: "Cannot confirm payment for a cancelled booking." },
        { status: 400 }
      );
    }

    const alreadyPaid = booking.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);

    const remainingBalance = Math.max(0, booking.totalPrice - alreadyPaid);

    let amount = body?.amount !== undefined ? Number(body.amount) : remainingBalance;
    if (isNaN(amount) || amount <= 0) {
      if (remainingBalance <= 0) {
        return NextResponse.json(
          { success: false, message: "This booking is already fully paid." },
          { status: 400 }
        );
      }
      amount = remainingBalance;
    }

    const txId = reference
      ? `MANUAL-${reference}`
      : `MANUAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const auditNote = `Manual payment verified by Owner #${user.id} (${user.name}): ${notes}`;

    // Perform atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create audited payment ledger entry
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount,
          paymentMethod: method,
          status: PaymentStatus.PAID,
          transactionRef: txId,
          paidAt: new Date(),
        },
      });

      const newTotalPaid = alreadyPaid + amount;
      const isFullyPaid = newTotalPaid >= booking.totalPrice;

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: isFullyPaid ? PaymentStatus.PAID : booking.paymentStatus,
          status: booking.status === BookingStatus.CANCELLED ? BookingStatus.CANCELLED : BookingStatus.CONFIRMED,
          notes: booking.notes ? `${booking.notes} | ${auditNote}` : auditNote,
        },
        include: {
          court: { include: { venue: true } },
          payments: true,
          user: true,
        },
      });

      return { payment, updatedBooking };
    });

    // Notify customer
    try {
      await createNotification({
        userId: booking.userId,
        type: NotificationType.PAYMENT_CONFIRMED,
        title: `Payment Confirmed: ${booking.bookingCode}`,
        message: `Your payment of ${amount.toLocaleString()} VND for booking ${booking.bookingCode} at ${booking.court.venue.name} has been verified and confirmed.`,
        link: "/bookings",
        metadata: {
          bookingId: booking.id,
          paymentId: result.payment.id,
          amount,
          confirmedByOwnerId: user.id,
        },
        idempotencyKey: `payment-audit-${result.payment.id}`,
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch payment confirmation notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully confirmed and recorded in audit ledger.",
      payment: result.payment,
      booking: result.updatedBooking,
    });
  } catch (error: any) {
    console.error("POST /api/owner/bookings/[id]/confirm-payment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to confirm payment." },
      { status: 500 }
    );
  }
}
