;; ============================================================
;; MOL-REPUTATION
;; On-Chain Reputation & Trust Score Contract
;;
;; Score Formula:
;;   (jobs_completed * 100) - (disputes * 200) + (streak_bonuses * 50)
;; Tiers: UNRANKED -> BRONZE -> SILVER -> GOLD -> PLATINUM -> DIAMOND
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-OWNER       (err u300))
(define-constant ERR-NOT-AUTHORIZED  (err u301))
(define-constant ERR-AGENT-NOT-FOUND (err u302))
(define-constant ERR-INVALID-RATING  (err u303))
(define-constant ERR-ALREADY-RATED   (err u304))

(define-constant POINTS-PER-COMPLETION  u100)
(define-constant POINTS-PER-DISPUTE     u200)
(define-constant STREAK-BONUS-THRESHOLD u5)
(define-constant STREAK-BONUS-POINTS    u50)

(define-data-var authorized-escrow principal CONTRACT-OWNER)

(define-map reputation
  { agent: principal }
  {
    jobs-completed:   uint,
    jobs-disputed:    uint,
    total-earned:     uint,
    current-streak:   uint,
    longest-streak:   uint,
    streak-bonuses:   uint,
    reputation-score: uint,
    first-job-block:  uint,
    last-job-block:   uint,
    badges:           uint
  }
)

(define-map job-ratings
  { job-id: uint }
  {
    rater:    principal,
    rated:    principal,
    score:    uint,
    comment:  (string-utf8 256),
    rated-at: uint
  }
)

(define-private (compute-score (completed uint) (disputed uint) (streaks uint))
  (let (
    (base (if (> (* completed POINTS-PER-COMPLETION) (* disputed POINTS-PER-DISPUTE))
      (- (* completed POINTS-PER-COMPLETION) (* disputed POINTS-PER-DISPUTE))
      u0))
    (bonus (* streaks STREAK-BONUS-POINTS))
  )
    (+ base bonus)
  )
)

(define-private (compute-badges (completed uint) (disputed uint) (streaks uint))
  (let (
    (b0 (if (>= completed u1)   u1  u0))
    (b1 (if (>= completed u10)  u2  u0))
    (b2 (if (>= completed u50)  u4  u0))
    (b3 (if (>= completed u100) u8  u0))
    (b4 (if (>= streaks u1)     u16 u0))
    (b5 (if (is-eq disputed u0) u32 u0))
  )
    (bit-or (bit-or (bit-or (bit-or (bit-or b0 b1) b2) b3) b4) b5)
  )
)

(define-private (ensure-reputation-exists (agent principal))
  (if (is-none (map-get? reputation { agent: agent }))
    (map-set reputation { agent: agent }
      {
        jobs-completed:   u0,
        jobs-disputed:    u0,
        total-earned:     u0,
        current-streak:   u0,
        longest-streak:   u0,
        streak-bonuses:   u0,
        reputation-score: u0,
        first-job-block:  block-height,
        last-job-block:   block-height,
        badges:           u0
      })
    true
  )
)

(define-public (record-completion (agent principal) (amount-earned uint))
  (let ((caller tx-sender))
    (asserts!
      (or (is-eq caller (var-get authorized-escrow)) (is-eq caller CONTRACT-OWNER))
      ERR-NOT-AUTHORIZED)
    (ensure-reputation-exists agent)
    (let (
      (rec (unwrap! (map-get? reputation { agent: agent }) ERR-AGENT-NOT-FOUND))
      (new-completed (+ (get jobs-completed rec) u1))
      (new-streak    (+ (get current-streak rec) u1))
      (new-longest   (if (> new-streak (get longest-streak rec)) new-streak (get longest-streak rec)))
      (streak-hit    (is-eq (mod new-streak STREAK-BONUS-THRESHOLD) u0))
      (new-bonuses   (if streak-hit (+ (get streak-bonuses rec) u1) (get streak-bonuses rec)))
      (new-earned    (+ (get total-earned rec) amount-earned))
      (new-score     (compute-score new-completed (get jobs-disputed rec) new-bonuses))
      (new-badges    (compute-badges new-completed (get jobs-disputed rec) new-bonuses))
    )
      (map-set reputation { agent: agent }
        (merge rec {
          jobs-completed:   new-completed,
          total-earned:     new-earned,
          current-streak:   new-streak,
          longest-streak:   new-longest,
          streak-bonuses:   new-bonuses,
          reputation-score: new-score,
          last-job-block:   block-height,
          badges:           new-badges
        }))
      (ok new-score)
    )
  )
)

(define-public (record-dispute (agent principal))
  (let ((caller tx-sender))
    (asserts!
      (or (is-eq caller (var-get authorized-escrow)) (is-eq caller CONTRACT-OWNER))
      ERR-NOT-AUTHORIZED)
    (ensure-reputation-exists agent)
    (let (
      (rec (unwrap! (map-get? reputation { agent: agent }) ERR-AGENT-NOT-FOUND))
      (new-disputed (+ (get jobs-disputed rec) u1))
      (new-score    (compute-score (get jobs-completed rec) new-disputed (get streak-bonuses rec)))
      (new-badges   (compute-badges (get jobs-completed rec) new-disputed (get streak-bonuses rec)))
    )
      (map-set reputation { agent: agent }
        (merge rec {
          jobs-disputed:    new-disputed,
          current-streak:   u0,
          reputation-score: new-score,
          badges:           new-badges
        }))
      (ok new-score)
    )
  )
)

(define-public (rate-agent (job-id uint) (rated principal) (score uint) (comment (string-utf8 256)))
  (let ((caller tx-sender))
    (asserts! (and (>= score u1) (<= score u5)) ERR-INVALID-RATING)
    (asserts! (is-none (map-get? job-ratings { job-id: job-id })) ERR-ALREADY-RATED)
    (map-set job-ratings { job-id: job-id }
      { rater: caller, rated: rated, score: score, comment: comment, rated-at: block-height })
    (ok true)
  )
)

(define-public (set-authorized-escrow (escrow principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (var-set authorized-escrow escrow)
    (ok true)
  )
)

(define-read-only (get-reputation (agent principal))
  (map-get? reputation { agent: agent }))

(define-read-only (get-reputation-score (agent principal))
  (match (map-get? reputation { agent: agent }) rec (some (get reputation-score rec)) none))

(define-read-only (get-job-rating (job-id uint))
  (map-get? job-ratings { job-id: job-id }))

(define-read-only (get-tier (agent principal))
  (match (map-get? reputation { agent: agent })
    rec
      (let ((score (get reputation-score rec)))
        (if (< score u100)   u"UNRANKED"
        (if (< score u500)   u"BRONZE"
        (if (< score u1500)  u"SILVER"
        (if (< score u5000)  u"GOLD"
        (if (< score u10000) u"PLATINUM"
        u"DIAMOND"))))))
    u"UNRANKED"))

(define-read-only (has-badge (agent principal) (badge-bit uint))
  (match (map-get? reputation { agent: agent })
    rec (> (bit-and (get badges rec) badge-bit) u0)
    false))

(define-read-only (get-authorized-escrow) (var-get authorized-escrow))
