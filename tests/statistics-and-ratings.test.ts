import { prisma } from "../lib/prisma";
import {
  submitMatchResult,
  confirmMatchResult,
  disputeMatchResult,
  getMatchResult,
} from "../lib/match-result-service";
import {
  createPlayerReview,
  updatePlayerReview,
  reportPlayerReview,
  getPlayerReviews,
} from "../lib/player-review-service";
import { getPlayerStatistics } from "../lib/player-statistics";
import { getLeaderboard } from "../lib/leaderboard-engine";
import {
  MatchStatus,
  MatchResultStatus,
  ParticipantStatus,
  ParticipantRole,
  ReviewModerationStatus,
  SkillLevel,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
}

async function runStatisticsAndRatingsTests() {
  console.log("=================================================");
  console.log("🏸 BOOKMEBADMINTON PHASE 5: RATINGS & STATS TESTS 🏸");
  console.log("=================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      process.stdout.write(`• Testing: ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passedCount++;
    } catch (err: any) {
      console.log("❌ FAILED");
      console.error("  ", err.message || err);
      failedCount++;
    }
  }

  // Setup: Create test venue and users
  const venue = await prisma.venue.create({
    data: {
      name: "Stats Arena Hanoi",
      location: "Cau Giay, Hanoi",
      address: "123 Xuan Thuy",
      openTime: "06:00",
      closeTime: "23:00",
    },
  });

  const timestamp = Date.now();
  const playerA = await prisma.user.create({
    data: {
      email: `playerA_${timestamp}@badminton.test`,
      name: "Player A Alpha",
      role: "CUSTOMER",
      profile: {
        create: {
          displayName: "Player Alpha",
          skillLevel: SkillLevel.ADVANCED,
          playingStyle: "SINGLES",
          homeVenueId: venue.id,
        },
      },
    },
    include: { profile: true },
  });

  const playerB = await prisma.user.create({
    data: {
      email: `playerB_${timestamp}@badminton.test`,
      name: "Player B Beta",
      role: "CUSTOMER",
      profile: {
        create: {
          displayName: "Player Beta",
          skillLevel: SkillLevel.INTERMEDIATE,
          playingStyle: "SINGLES",
          homeVenueId: venue.id,
        },
      },
    },
    include: { profile: true },
  });

  const playerC = await prisma.user.create({
    data: {
      email: `playerC_${timestamp}@badminton.test`,
      name: "Player C Gamma",
      role: "CUSTOMER",
      profile: {
        create: {
          displayName: "Player Gamma",
          skillLevel: SkillLevel.BEGINNER,
          playingStyle: "DOUBLES",
          homeVenueId: venue.id,
        },
      },
    },
    include: { profile: true },
  });

  const playerD = await prisma.user.create({
    data: {
      email: `playerD_${timestamp}@badminton.test`,
      name: "Player D Delta",
      role: "CUSTOMER",
      profile: {
        create: {
          displayName: "Player Delta",
          skillLevel: SkillLevel.ADVANCED,
          playingStyle: "DOUBLES",
          homeVenueId: venue.id,
        },
      },
    },
    include: { profile: true },
  });

  const outsider = await prisma.user.create({
    data: {
      email: `outsider_${timestamp}@badminton.test`,
      name: "Outsider User",
      role: "CUSTOMER",
    },
  });

  // Helper to create a past match
  async function createPastMatch(creatorId: number, otherParticipantIds: number[], status: MatchStatus = MatchStatus.OPEN) {
    const pastDate = new Date(Date.now() - 24 * 3600 * 1000); // 24 hours ago (yesterday)
    const match = await prisma.match.create({
      data: {
        title: "Test Past Match",
        creatorId,
        venueId: venue.id,
        date: pastDate,
        startTime: "10:00",
        endTime: "12:00",
        status,
        participants: {
          create: [
            { userId: creatorId, role: ParticipantRole.HOST, status: ParticipantStatus.JOINED },
            ...otherParticipantIds.map((uId) => ({
              userId: uId,
              role: ParticipantRole.PLAYER,
              status: ParticipantStatus.JOINED,
            })),
          ],
        },
      },
      include: { participants: true },
    });
    return match;
  }

  // Helper to create a future match
  async function createFutureMatch(creatorId: number, otherParticipantIds: number[]) {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000); // in 2 days
    const match = await prisma.match.create({
      data: {
        title: "Test Future Match",
        creatorId,
        venueId: venue.id,
        date: futureDate,
        startTime: "18:00",
        endTime: "20:00",
        status: MatchStatus.OPEN,
        participants: {
          create: [
            { userId: creatorId, role: ParticipantRole.HOST, status: ParticipantStatus.JOINED },
            ...otherParticipantIds.map((uId) => ({
              userId: uId,
              role: ParticipantRole.PLAYER,
              status: ParticipantStatus.JOINED,
            })),
          ],
        },
      },
      include: { participants: true },
    });
    return match;
  }

  try {
    // 1. Valid and Invalid Result Submissions
    await test("1. Valid and invalid result submissions", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);

      // Blank score rejected
      let errorThrown = false;
      try {
        await submitMatchResult({
          matchId: match.id,
          submittedById: playerA.id,
          score: "",
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Match score is required"), "Score requirement message");
      }
      assert(errorThrown, "Should reject empty score");

      // Player in both teams rejected
      errorThrown = false;
      try {
        await submitMatchResult({
          matchId: match.id,
          submittedById: playerA.id,
          score: "21-19, 21-18",
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerA.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("cannot be in both Team 1 and Team 2"), "Duplicate team player error");
      }
      assert(errorThrown, "Should reject player in both teams");

      // Set score validation: team set won mismatch
      errorThrown = false;
      try {
        await submitMatchResult({
          matchId: match.id,
          submittedById: playerA.id,
          score: "21-19, 21-18",
          setScores: [
            { set: 1, team1: 15, team2: 21 },
            { set: 2, team1: 18, team2: 21 },
          ],
          winnerTeam: 1, // claims team 1 won, but setScores say team 2 won both sets
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Team 2 won more sets"), "Mismatch sets error");
      }
      assert(errorThrown, "Should reject winner mismatch with set scores");

      // Valid submission
      const result = await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-19, 18-21, 21-17",
        setScores: [
          { set: 1, team1: 21, team2: 19 },
          { set: 2, team1: 18, team2: 21 },
          { set: 3, team1: 21, team2: 17 },
        ],
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });

      assert(result.status === MatchResultStatus.PENDING_CONFIRMATION, "Result starts in pending confirmation");
      assert(result.score === "21-19, 18-21, 21-17", "Score stored accurately");
      assert(result.winnerTeam === 1, "Winner team is 1");
      assert(result.winningPlayerIds.includes(playerA.id), "Winning players contains player A");
    });

    // 2. Non-Participant Access Attempts
    await test("2. Non-participant access attempts rejection", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);

      // Outsider submitting
      let errorThrown = false;
      try {
        await submitMatchResult({
          matchId: match.id,
          submittedById: outsider.id,
          score: "21-19, 21-15",
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Only active participants"), "Submitter must be participant");
      }
      assert(errorThrown, "Non-participant submit rejected");

      // Submit valid result first
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-19, 21-15",
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });

      // Outsider confirming
      errorThrown = false;
      try {
        await confirmMatchResult({
          matchId: match.id,
          confirmedById: outsider.id,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Only active participants"), "Confirmer must be participant");
      }
      assert(errorThrown, "Non-participant confirm rejected");

      // Outsider disputing
      errorThrown = false;
      try {
        await disputeMatchResult({
          matchId: match.id,
          disputedById: outsider.id,
          reason: "I was not even there",
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Only active participants"), "Disputer must be participant");
      }
      assert(errorThrown, "Non-participant dispute rejected");
    });

    // 3. Cancelled and Incomplete Match Result Rejection
    await test("3. Cancelled and incomplete match result rejection", async () => {
      // Future match
      const futureMatch = await createFutureMatch(playerA.id, [playerB.id]);
      let errorThrown = false;
      try {
        await submitMatchResult({
          matchId: futureMatch.id,
          submittedById: playerA.id,
          score: "21-10, 21-12",
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("not finished yet"), "Cannot submit before end time");
      }
      assert(errorThrown, "Future match result submission rejected");

      // Cancelled match
      const cancelledMatch = await createPastMatch(playerA.id, [playerB.id], MatchStatus.CANCELLED);
      errorThrown = false;
      try {
        await submitMatchResult({
          matchId: cancelledMatch.id,
          submittedById: playerA.id,
          score: "21-10, 21-12",
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("cancelled match"), "Cannot submit for cancelled match");
      }
      assert(errorThrown, "Cancelled match result submission rejected");
    });

    // 4. Result Confirmation and Dispute Handling
    await test("4. Result confirmation and dispute workflow", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);

      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-15, 21-17",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });

      // Submitter cannot confirm own result
      let errorThrown = false;
      try {
        await confirmMatchResult({
          matchId: match.id,
          confirmedById: playerA.id,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Submitter cannot confirm their own result"), "Self-confirm error");
      }
      assert(errorThrown, "Self confirmation blocked");

      // Opponent disputes result
      const disputed = await disputeMatchResult({
        matchId: match.id,
        disputedById: playerB.id,
        reason: "Score was 21-19, not 21-15",
      });
      assert(disputed.status === MatchResultStatus.DISPUTED, "Result status is DISPUTED");
      assert(disputed.disputeReason === "Score was 21-19, not 21-15", "Dispute reason recorded");

      // Attempting to confirm a disputed result fails
      errorThrown = false;
      try {
        await confirmMatchResult({
          matchId: match.id,
          confirmedById: playerB.id,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Cannot confirm a disputed match result"), "Disputed confirm blocked");
      }
      assert(errorThrown, "Confirming disputed result rejected");

      // Player A resubmits corrected score
      const resubmitted = await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-19, 21-17",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });
      assert(resubmitted.status === MatchResultStatus.PENDING_CONFIRMATION, "Resubmission resets to pending");
      assert(resubmitted.disputeReason === null, "Dispute reason cleared");

      // Opponent confirms result
      const confirmed = await confirmMatchResult({
        matchId: match.id,
        confirmedById: playerB.id,
      });
      assert(confirmed.status === MatchResultStatus.CONFIRMED, "Result status is CONFIRMED");
      assert(confirmed.confirmedById === playerB.id, "Confirmed by player B");

      // Check match status updated to COMPLETED with completedAt
      const updatedMatch = await prisma.match.findUnique({ where: { id: match.id } });
      assert(updatedMatch?.status === MatchStatus.COMPLETED, "Match status updated to COMPLETED");
      assert(updatedMatch?.completedAt !== null, "Match completedAt timestamp populated");
    });

    // 5. Preventing Duplicate Final Results
    await test("5. Preventing duplicate final results", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);

      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-18, 21-16",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });

      await confirmMatchResult({
        matchId: match.id,
        confirmedById: playerB.id,
      });

      // Trying to resubmit after confirmation rejected
      let errorThrown = false;
      try {
        await submitMatchResult({
          matchId: match.id,
          submittedById: playerB.id,
          score: "21-10, 21-10",
          winnerTeam: 2,
          team1PlayerIds: [playerA.id],
          team2PlayerIds: [playerB.id],
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("already been confirmed and finalized"), "Final result cannot be altered");
      }
      assert(errorThrown, "Duplicate final result submission rejected");
    });

    // 6. Rating Eligibility and Self-Rating Prevention
    await test("6. Rating eligibility and self-rating prevention", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);

      // Incomplete match rating rejected
      let errorThrown = false;
      try {
        await createPlayerReview({
          matchId: match.id,
          reviewerId: playerA.id,
          recipientId: playerB.id,
          rating: 5,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("completed matches"), "Match must be completed");
      }
      assert(errorThrown, "Incomplete match rating rejected");

      // Complete the match
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-14, 21-12",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });
      await confirmMatchResult({
        matchId: match.id,
        confirmedById: playerB.id,
      });

      // Self-rating rejected
      errorThrown = false;
      try {
        await createPlayerReview({
          matchId: match.id,
          reviewerId: playerA.id,
          recipientId: playerA.id,
          rating: 5,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("cannot rate or review yourself"), "Self review blocked");
      }
      assert(errorThrown, "Self-rating prevented");

      // Non-participant rating rejected
      errorThrown = false;
      try {
        await createPlayerReview({
          matchId: match.id,
          reviewerId: outsider.id,
          recipientId: playerA.id,
          rating: 5,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("Only participants in this match"), "Outsider review blocked");
      }
      assert(errorThrown, "Non-participant review rejected");

      // Invalid star rating (out of 1-5) rejected
      errorThrown = false;
      try {
        await createPlayerReview({
          matchId: match.id,
          reviewerId: playerA.id,
          recipientId: playerB.id,
          rating: 6,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("between 1 and 5 stars"), "Stars range error");
      }
      assert(errorThrown, "Star rating out of range rejected");
    });

    // 7. Duplicate Review Prevention
    await test("7. Duplicate review prevention", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-16, 21-19",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });
      await confirmMatchResult({ matchId: match.id, confirmedById: playerB.id });

      // First review succeeds
      const review1 = await createPlayerReview({
        matchId: match.id,
        reviewerId: playerA.id,
        recipientId: playerB.id,
        rating: 5,
        comment: "Great defense and sportsmanship!",
      });
      assert(review1.rating === 5, "Review 1 submitted");

      // Second review for same reviewer, recipient, and match rejected
      let errorThrown = false;
      try {
        await createPlayerReview({
          matchId: match.id,
          reviewerId: playerA.id,
          recipientId: playerB.id,
          rating: 4,
          comment: "Duplicate attempt",
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("already submitted a review"), "Duplicate review error");
      }
      assert(errorThrown, "Duplicate review prevented");
    });

    // 8. Rating Edit Time Limits
    await test("8. Rating edit policy and 48-hour limit", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-10, 21-12",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });
      await confirmMatchResult({ matchId: match.id, confirmedById: playerB.id });

      const review = await createPlayerReview({
        matchId: match.id,
        reviewerId: playerB.id,
        recipientId: playerA.id,
        rating: 4,
        comment: "Good match",
      });

      // Edit by author within 48h succeeds
      const updated = await updatePlayerReview({
        reviewId: review.id,
        reviewerId: playerB.id,
        rating: 5,
        comment: "Excellent smash and footwork!",
      });
      assert(updated.rating === 5, "Rating updated to 5");
      assert(updated.comment === "Excellent smash and footwork!", "Comment updated");

      // Edit by non-author rejected
      let errorThrown = false;
      try {
        await updatePlayerReview({
          reviewId: review.id,
          reviewerId: playerA.id,
          rating: 1,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("only edit your own reviews"), "Ownership check");
      }
      assert(errorThrown, "Non-author review edit rejected");

      // Mock createdAt to 50 hours ago to test time limit rejection
      await prisma.playerReview.update({
        where: { id: review.id },
        data: { createdAt: new Date(Date.now() - 50 * 3600 * 1000) },
      });

      errorThrown = false;
      try {
        await updatePlayerReview({
          reviewId: review.id,
          reviewerId: playerB.id,
          rating: 3,
        });
      } catch (err: any) {
        errorThrown = true;
        assert(err.message.includes("within 48 hours"), "Edit window expired error");
      }
      assert(errorThrown, "Edit after 48 hours rejected");
    });

    // 9. Correct Wins, Losses, Win Rates, and Streaks
    await test("9. Correct calculation of wins, losses, win rates, and streaks", async () => {
      // Create user S with fresh match history
      const userS = await prisma.user.create({
        data: {
          email: `userS_${timestamp}@badminton.test`,
          name: "Streak Tester",
          role: "CUSTOMER",
          profile: {
            create: {
              displayName: "Streak Tester",
              skillLevel: SkillLevel.ADVANCED,
            },
          },
        },
      });

      // Match 1: Win for userS
      const m1 = await createPastMatch(userS.id, [playerB.id]);
      await submitMatchResult({
        matchId: m1.id,
        submittedById: userS.id,
        score: "21-18, 21-15",
        winnerTeam: 1,
        team1PlayerIds: [userS.id],
        team2PlayerIds: [playerB.id],
      });
      await confirmMatchResult({ matchId: m1.id, confirmedById: playerB.id });

      // Match 2: Win for userS
      const m2 = await createPastMatch(userS.id, [playerC.id]);
      await submitMatchResult({
        matchId: m2.id,
        submittedById: userS.id,
        score: "21-12, 21-14",
        winnerTeam: 1,
        team1PlayerIds: [userS.id],
        team2PlayerIds: [playerC.id],
      });
      await confirmMatchResult({ matchId: m2.id, confirmedById: playerC.id });

      // Match 3: Win for userS
      const m3 = await createPastMatch(userS.id, [playerD.id]);
      await submitMatchResult({
        matchId: m3.id,
        submittedById: userS.id,
        score: "21-16, 21-18",
        winnerTeam: 1,
        team1PlayerIds: [userS.id],
        team2PlayerIds: [playerD.id],
      });
      await confirmMatchResult({ matchId: m3.id, confirmedById: playerD.id });

      let stats = await getPlayerStatistics(userS.id);
      assert(stats.wins === 3, "Wins should be 3");
      assert(stats.losses === 0, "Losses should be 0");
      assert(stats.winRate === 100, "Win rate should be 100%");
      assert(stats.currentStreak.label === "3W", "Current streak should be 3W");
      assert(stats.bestWinStreak === 3, "Best win streak should be 3");

      // Match 4: Loss for userS (Opponent playerA wins)
      const m4 = await createPastMatch(userS.id, [playerA.id]);
      await submitMatchResult({
        matchId: m4.id,
        submittedById: userS.id,
        score: "19-21, 18-21",
        winnerTeam: 2,
        team1PlayerIds: [userS.id],
        team2PlayerIds: [playerA.id],
      });
      await confirmMatchResult({ matchId: m4.id, confirmedById: playerA.id });

      stats = await getPlayerStatistics(userS.id);
      assert(stats.wins === 3, "Wins should still be 3");
      assert(stats.losses === 1, "Losses should be 1");
      assert(stats.winRate === 75, "Win rate should be 75% (3/4)");
      assert(stats.currentStreak.label === "1L", "Current streak should transition to 1L");
      assert(stats.bestWinStreak === 3, "Best win streak should be preserved at 3");
    });

    // 10. Players with Zero Matches
    await test("10. Players with zero matches handle safely", async () => {
      const freshUser = await prisma.user.create({
        data: {
          email: `fresh_${timestamp}@badminton.test`,
          name: "Fresh User",
          role: "CUSTOMER",
          profile: {
            create: { displayName: "Fresh Player", skillLevel: SkillLevel.BEGINNER },
          },
        },
      });

      const stats = await getPlayerStatistics(freshUser.id);
      assert(stats.matchesPlayed === 0, "Matches played should be 0");
      assert(stats.wins === 0, "Wins should be 0");
      assert(stats.losses === 0, "Losses should be 0");
      assert(stats.winRate === 0, "Win rate should be 0");
      assert(stats.currentStreak.label === "-", "Streak label should be dash");
      assert(stats.averageRating === 0, "Average rating should be 0");
      assert(stats.ratingsCount === 0, "Ratings count should be 0");
      assert(stats.recentMatches.length === 0, "Recent matches should be empty array");
    });

    // 11. Leaderboard Filters, Thresholds, and Tie-Breakers
    await test("11. Leaderboard filters, thresholds, and deterministic tie-breakers", async () => {
      // Query wins leaderboard
      const lbWins = await getLeaderboard({ metric: "wins", period: "all-time" });
      assert(lbWins.entries.length > 0, "Should return entries");
      assert(lbWins.criteria.minMatchesRequired === 1, "Wins requires min 1 match");

      // Verify deterministic rank order (rank 1 <= rank 2 <= ...)
      for (let i = 0; i < lbWins.entries.length - 1; i++) {
        const cur = lbWins.entries[i];
        const next = lbWins.entries[i + 1];
        if (cur.isEligible && next.isEligible) {
          assert(cur.wins >= next.wins, "Deterministic wins order");
        }
      }

      // Query winRate leaderboard: players with < 3 matches are marked under threshold
      const lbWinRate = await getLeaderboard({ metric: "winRate", period: "all-time" });
      assert(lbWinRate.criteria.minMatchesRequired === 3, "Win rate requires min 3 matches");

      const unqualified = lbWinRate.entries.find((e) => e.matchesPlayed < 3);
      if (unqualified) {
        assert(!unqualified.isEligible, "Player with < 3 matches is marked ineligible for win rate");
      }

      // Query rating leaderboard: requires min 3 reviews
      const lbRating = await getLeaderboard({ metric: "rating", period: "all-time" });
      assert(lbRating.criteria.minReviewsRequired === 3, "Rating requires min 3 reviews");

      // Query skill level filter
      const lbAdvanced = await getLeaderboard({ skillLevel: "ADVANCED" });
      for (const entry of lbAdvanced.entries) {
        assert(entry.skillLevel === "ADVANCED", "Skill level filter respected");
      }
    });

    // 12. Preventing Disputed Results from Affecting Rankings
    await test("12. Preventing disputed results from affecting statistics and rankings", async () => {
      const match = await createPastMatch(playerC.id, [playerD.id]);

      // Submit and dispute
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerC.id,
        score: "21-5, 21-5",
        winnerTeam: 1,
        team1PlayerIds: [playerC.id],
        team2PlayerIds: [playerD.id],
      });
      await disputeMatchResult({
        matchId: match.id,
        disputedById: playerD.id,
        reason: "Game was cancelled mid-way",
      });

      // Player C's statistics must NOT count this disputed match as a win
      const statsC = await getPlayerStatistics(playerC.id);
      const wonDisputed = statsC.recentMatches.some((m) => m.matchId === match.id);
      assert(!wonDisputed, "Disputed match must not appear in confirmed stats");

      // Leaderboard must not include disputed match wins
      const lb = await getLeaderboard({ metric: "wins", period: "all-time" });
      const entryC = lb.entries.find((e) => e.userId === playerC.id);
      assert((entryC?.wins || 0) === statsC.wins, "Leaderboard matches confirmed stats only");
    });

    // 13. Review Reporting and Moderation
    await test("13. Review reporting and moderation mechanisms", async () => {
      const match = await createPastMatch(playerA.id, [playerB.id]);
      await submitMatchResult({
        matchId: match.id,
        submittedById: playerA.id,
        score: "21-19, 21-17",
        winnerTeam: 1,
        team1PlayerIds: [playerA.id],
        team2PlayerIds: [playerB.id],
      });
      await confirmMatchResult({ matchId: match.id, confirmedById: playerB.id });

      const review = await createPlayerReview({
        matchId: match.id,
        reviewerId: playerB.id,
        recipientId: playerA.id,
        rating: 1,
        comment: "This review contains spam and inappropriate commentary",
      });

      // Report review
      const report = await reportPlayerReview({
        reviewId: review.id,
        reporterId: playerA.id,
        reason: "Offensive or abusive language",
        details: "False accusations in comment",
      });
      assert(report.id > 0, "Report created successfully");
      assert(report.status === "PENDING", "Report status is PENDING");

      // Verify privacy: getPlayerReviews must NOT expose reviewer email or phone
      const reviewsList = await getPlayerReviews(playerA.id);
      assert(reviewsList.reviews.length > 0, "Returns reviews");
      for (const rev of reviewsList.reviews) {
        assert(!("email" in (rev.reviewer as any)), "Reviewer email is not exposed");
        assert(!("phone" in (rev.reviewer as any)), "Reviewer phone is not exposed");
      }
    });
  } finally {
    // Cleanup test data safely
    try {
      const userIds = [playerA.id, playerB.id, playerC.id, playerD.id, outsider.id];
      await prisma.reviewReport.deleteMany({
        where: { reporterId: { in: userIds } },
      });
      await prisma.playerReview.deleteMany({
        where: {
          OR: [
            { reviewerId: { in: userIds } },
            { recipientId: { in: userIds } },
          ],
        },
      });
      await prisma.matchResult.deleteMany({
        where: { submittedById: { in: userIds } },
      });
      await prisma.matchParticipant.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.match.deleteMany({
        where: { creatorId: { in: userIds } },
      });
      await prisma.playerProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
      await prisma.venue.delete({
        where: { id: venue.id },
      });
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStatisticsAndRatingsTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
