;; ============================================================
;; MOL-ESCROW
;; Job State Machine & Payment Escrow Contract
;;
;; Job States:
;;   POSTED -> ACCEPTED -> ESCROWED -> DELIVERED -> SETTLED
;;                                              -> DISPUTED -> RESOLVED
;;                     -> CANCELLED
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)

(define-constant ERR-NOT-OWNER              (err u200))
(define-constant ERR-JOB-NOT-FOUND          (err u201))
(define-constant ERR-INVALID-STATE          (err u202))
(define-constant ERR-UNAUTHORIZED           (err u203))
(define-constant ERR-DISPUTE-WINDOW-OPEN    (err u207))
(define-constant ERR-DISPUTE-WINDOW-CLOSED  (err u208))
(define-constant ERR-ALREADY-DISPUTED       (err u209))
(define-constant ERR-SELF-HIRE              (err u211))
(define-constant ERR-ZERO-PAYMENT           (err u212))
(define-constant ERR-INVALID-DESCRIPTION    (err u213))

(define-constant STATE-POSTED    u1)
(define-constant STATE-ACCEPTED  u2)
(define-constant STATE-ESCROWED  u3)
(define-constant STATE-DELIVERED u4)
(define-constant STATE-SETTLED   u5)
(define-constant STATE-DISPUTED  u6)
(define-constant STATE-RESOLVED  u7)
(define-constant STATE-CANCELLED u8)

(define-constant DISPUTE-WINDOW-BLOCKS  u144)
(define-constant ACCEPT-WINDOW-BLOCKS   u72)
(define-constant PLATFORM-FEE-BPS u100)
(define-constant BPS-DENOMINATOR  u10000)

(define-data-var total-jobs uint u0)
(define-data-var platform-fees-collected uint u0)

(define-map jobs
  { job-id: uint }
  {
    buyer:           principal,
    seller:          principal,
    description:     (string-utf8 512),
    skill-required:  (string-utf8 64),
    payment-amount:  uint,
    currency:        uint,
    state:           uint,
    commitment-hash: (optional (buff 32)),
    posted-at:       uint,
    accepted-at:     (optional uint),
    escrowed-at:     (optional uint),
    delivered-at:    (optional uint),
    settled-at:      (optional uint),
    disputed-at:     (optional uint),
    x402-payment-id: (optional (string-utf8 128))
  }
)

(define-map disputes
  { job-id: uint }
  {
    raised-by:   principal,
    reason:      (string-utf8 512),
    raised-at:   uint,
    resolved-by: (optional principal),
    resolution:  (optional (string-utf8 256)),
    resolved-at: (optional uint)
  }
)

(define-map buyer-job-count { buyer: principal } { count: uint })
(define-map buyer-jobs { buyer: principal, index: uint } { job-id: uint })
(define-map seller-job-count { seller: principal } { count: uint })
(define-map seller-jobs { seller: principal, index: uint } { job-id: uint })

(define-private (next-job-id)
  (let ((current (var-get total-jobs)))
    (var-set total-jobs (+ current u1))
    current
  )
)

(define-private (calculate-platform-fee (amount uint))
  (/ (* amount PLATFORM-FEE-BPS) BPS-DENOMINATOR)
)

(define-private (calculate-seller-payout (amount uint))
  (- amount (calculate-platform-fee amount))
)

(define-private (record-buyer-job (buyer principal) (job-id uint))
  (let ((current-count (default-to u0 (get count (map-get? buyer-job-count { buyer: buyer })))))
    (map-set buyer-jobs { buyer: buyer, index: current-count } { job-id: job-id })
    (map-set buyer-job-count { buyer: buyer } { count: (+ current-count u1) })
  )
)

(define-private (record-seller-job (seller principal) (job-id uint))
  (let ((current-count (default-to u0 (get count (map-get? seller-job-count { seller: seller })))))
    (map-set seller-jobs { seller: seller, index: current-count } { job-id: job-id })
    (map-set seller-job-count { seller: seller } { count: (+ current-count u1) })
  )
)

(define-public (post-job
    (seller          principal)
    (description     (string-utf8 512))
    (skill-required  (string-utf8 64))
    (payment-amount  uint)
    (currency        uint)
    (x402-payment-id (optional (string-utf8 128)))
  )
  (let (
    (buyer tx-sender)
    (job-id (next-job-id))
  )
    (asserts! (not (is-eq buyer seller)) ERR-SELF-HIRE)
    (asserts! (> payment-amount u0) ERR-ZERO-PAYMENT)
    (asserts! (> (len description) u0) ERR-INVALID-DESCRIPTION)
    (asserts! (> (len skill-required) u0) ERR-INVALID-DESCRIPTION)

    (map-set jobs
      { job-id: job-id }
      {
        buyer:           buyer,
        seller:          seller,
        description:     description,
        skill-required:  skill-required,
        payment-amount:  payment-amount,
        currency:        currency,
        state:           STATE-POSTED,
        commitment-hash: none,
        posted-at:       block-height,
        accepted-at:     none,
        escrowed-at:     none,
        delivered-at:    none,
        settled-at:      none,
        disputed-at:     none,
        x402-payment-id: x402-payment-id
      }
    )

    (record-buyer-job buyer job-id)
    (record-seller-job seller job-id)
    (ok job-id)
  )
)

(define-public (accept-job (job-id uint))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
  )
    (asserts! (is-eq caller (get seller job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-POSTED) ERR-INVALID-STATE)
    (asserts! (<= block-height (+ (get posted-at job) ACCEPT-WINDOW-BLOCKS)) ERR-INVALID-STATE)
    (map-set jobs { job-id: job-id }
      (merge job { state: STATE-ACCEPTED, accepted-at: (some block-height) }))
    (ok true)
  )
)

(define-public (fund-escrow (job-id uint))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (amount (get payment-amount job))
  )
    (asserts! (is-eq caller (get buyer job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-ACCEPTED) ERR-INVALID-STATE)
    (try! (stx-transfer? amount caller (as-contract tx-sender)))
    (var-set platform-fees-collected (+ (var-get platform-fees-collected) (calculate-platform-fee amount)))
    (map-set jobs { job-id: job-id }
      (merge job { state: STATE-ESCROWED, escrowed-at: (some block-height) }))
    (ok true)
  )
)

(define-public (submit-delivery (job-id uint) (commitment-hash (buff 32)))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
  )
    (asserts! (is-eq caller (get seller job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-ESCROWED) ERR-INVALID-STATE)
    (map-set jobs { job-id: job-id }
      (merge job {
        state:           STATE-DELIVERED,
        commitment-hash: (some commitment-hash),
        delivered-at:    (some block-height)
      }))
    (ok true)
  )
)

(define-public (approve-delivery (job-id uint))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (payout (calculate-seller-payout (get payment-amount job)))
  )
    (asserts! (is-eq caller (get buyer job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-DELIVERED) ERR-INVALID-STATE)
    (try! (as-contract (stx-transfer? payout tx-sender (get seller job))))
    (map-set jobs { job-id: job-id }
      (merge job { state: STATE-SETTLED, settled-at: (some block-height) }))
    (ok payout)
  )
)

(define-public (auto-settle (job-id uint))
  (let (
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (payout (calculate-seller-payout (get payment-amount job)))
    (delivered-at-block (unwrap! (get delivered-at job) ERR-INVALID-STATE))
  )
    (asserts! (is-eq (get state job) STATE-DELIVERED) ERR-INVALID-STATE)
    (asserts! (> block-height (+ delivered-at-block DISPUTE-WINDOW-BLOCKS)) ERR-DISPUTE-WINDOW-OPEN)
    (try! (as-contract (stx-transfer? payout tx-sender (get seller job))))
    (map-set jobs { job-id: job-id }
      (merge job { state: STATE-SETTLED, settled-at: (some block-height) }))
    (ok payout)
  )
)

(define-public (raise-dispute (job-id uint) (reason (string-utf8 512)))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (delivered-at-block (unwrap! (get delivered-at job) ERR-INVALID-STATE))
  )
    (asserts! (is-eq caller (get buyer job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-DELIVERED) ERR-INVALID-STATE)
    (asserts! (<= block-height (+ delivered-at-block DISPUTE-WINDOW-BLOCKS)) ERR-DISPUTE-WINDOW-CLOSED)
    (asserts! (is-none (map-get? disputes { job-id: job-id })) ERR-ALREADY-DISPUTED)
    (map-set disputes { job-id: job-id }
      {
        raised-by:   caller,
        reason:      reason,
        raised-at:   block-height,
        resolved-by: none,
        resolution:  none,
        resolved-at: none
      }
    )
    (map-set jobs { job-id: job-id }
      (merge job { state: STATE-DISPUTED, disputed-at: (some block-height) }))
    (ok true)
  )
)

(define-public (resolve-dispute (job-id uint) (resolution (string-utf8 256)))
  (let (
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (dispute (unwrap! (map-get? disputes { job-id: job-id }) ERR-JOB-NOT-FOUND))
    (amount (get payment-amount job))
    (payout (calculate-seller-payout amount))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (asserts! (is-eq (get state job) STATE-DISPUTED) ERR-INVALID-STATE)
    (if (is-eq resolution u"SELLER_WINS")
      (try! (as-contract (stx-transfer? payout tx-sender (get seller job))))
      (try! (as-contract (stx-transfer? amount tx-sender (get buyer job))))
    )
    (map-set disputes { job-id: job-id }
      (merge dispute { resolved-by: (some tx-sender), resolution: (some resolution), resolved-at: (some block-height) }))
    (map-set jobs { job-id: job-id } (merge job { state: STATE-RESOLVED }))
    (ok true)
  )
)

(define-public (cancel-job (job-id uint))
  (let (
    (caller tx-sender)
    (job (unwrap! (map-get? jobs { job-id: job-id }) ERR-JOB-NOT-FOUND))
  )
    (asserts! (is-eq caller (get buyer job)) ERR-UNAUTHORIZED)
    (asserts! (is-eq (get state job) STATE-POSTED) ERR-INVALID-STATE)
    (map-set jobs { job-id: job-id } (merge job { state: STATE-CANCELLED }))
    (ok true)
  )
)

(define-public (withdraw-platform-fees (recipient principal))
  (let ((fees (var-get platform-fees-collected)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (asserts! (> fees u0) ERR-ZERO-PAYMENT)
    (try! (as-contract (stx-transfer? fees tx-sender recipient)))
    (var-set platform-fees-collected u0)
    (ok fees)
  )
)

(define-read-only (get-job (job-id uint)) (map-get? jobs { job-id: job-id }))
(define-read-only (get-job-state (job-id uint))
  (match (map-get? jobs { job-id: job-id }) job (some (get state job)) none))
(define-read-only (get-dispute (job-id uint)) (map-get? disputes { job-id: job-id }))
(define-read-only (get-total-jobs) (var-get total-jobs))
(define-read-only (get-platform-fees) (var-get platform-fees-collected))
(define-read-only (get-buyer-job-count (buyer principal))
  (default-to u0 (get count (map-get? buyer-job-count { buyer: buyer }))))
(define-read-only (get-seller-job-count (seller principal))
  (default-to u0 (get count (map-get? seller-job-count { seller: seller }))))
(define-read-only (get-buyer-job-at (buyer principal) (index uint))
  (map-get? buyer-jobs { buyer: buyer, index: index }))
(define-read-only (get-seller-job-at (seller principal) (index uint))
  (map-get? seller-jobs { seller: seller, index: index }))
(define-read-only (can-auto-settle (job-id uint))
  (match (map-get? jobs { job-id: job-id })
    job (match (get delivered-at job)
      delivered-block
        (and (is-eq (get state job) STATE-DELIVERED)
             (> block-height (+ delivered-block DISPUTE-WINDOW-BLOCKS)))
      false)
    false))
