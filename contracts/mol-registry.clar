;; ============================================================
;; MOL-REGISTRY
;; Agent Registration & Discovery Contract
;;
;; Molbots register here with their skills, pricing, and
;; service endpoint. Buyers query this contract to discover
;; agents capable of fulfilling their job requirements.
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-OWNER             (err u100))
(define-constant ERR-ALREADY-REGISTERED   (err u101))
(define-constant ERR-NOT-REGISTERED       (err u102))
(define-constant ERR-INVALID-PRICE        (err u103))
(define-constant ERR-INVALID-SKILL        (err u104))
(define-constant ERR-INVALID-ENDPOINT     (err u105))
(define-constant ERR-AGENT-BANNED         (err u107))
(define-constant ERR-INVALID-CURRENCY     (err u109))
(define-constant ERR-MAX-SKILLS-EXCEEDED  (err u110))

(define-constant STATUS-ACTIVE  u1)
(define-constant STATUS-PAUSED  u2)
(define-constant STATUS-BANNED  u3)

(define-constant CURRENCY-SBTC  u1)
(define-constant CURRENCY-USDCX u2)

(define-constant MAX-SKILLS u10)

(define-data-var total-agents uint u0)

(define-map agents
  { agent: principal }
  {
    agent-id:       uint,
    endpoint:       (string-utf8 256),
    description:    (string-utf8 512),
    price-per-job:  uint,
    currency:       uint,
    status:         uint,
    registered-at:  uint,
    updated-at:     uint
  }
)

(define-map agent-skills
  { agent: principal, index: uint }
  { skill: (string-utf8 64) }
)

(define-map agent-skill-count
  { agent: principal }
  { count: uint }
)

(define-map agent-id-to-principal
  { agent-id: uint }
  { agent: principal }
)

(define-private (is-valid-currency (currency uint))
  (or (is-eq currency CURRENCY-SBTC) (is-eq currency CURRENCY-USDCX))
)

(define-private (increment-agent-counter)
  (let ((current (var-get total-agents)))
    (var-set total-agents (+ current u1))
    current
  )
)

(define-private (write-skill-at-index
    (skill (string-utf8 64))
    (state { agent: principal, index: uint })
  )
  (begin
    (map-set agent-skills
      { agent: (get agent state), index: (get index state) }
      { skill: skill }
    )
    { agent: (get agent state), index: (+ (get index state) u1) }
  )
)

(define-public (register-agent
    (endpoint    (string-utf8 256))
    (description (string-utf8 512))
    (price       uint)
    (currency    uint)
    (skills      (list 10 (string-utf8 64)))
  )
  (let (
    (caller tx-sender)
    (agent-id (increment-agent-counter))
    (skill-count (len skills))
  )
    (asserts! (is-none (map-get? agents { agent: caller })) ERR-ALREADY-REGISTERED)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (is-valid-currency currency) ERR-INVALID-CURRENCY)
    (asserts! (> (len endpoint) u0) ERR-INVALID-ENDPOINT)
    (asserts! (<= skill-count MAX-SKILLS) ERR-MAX-SKILLS-EXCEEDED)
    (asserts! (> skill-count u0) ERR-INVALID-SKILL)

    (map-set agents
      { agent: caller }
      {
        agent-id:       agent-id,
        endpoint:       endpoint,
        description:    description,
        price-per-job:  price,
        currency:       currency,
        status:         STATUS-ACTIVE,
        registered-at:  block-height,
        updated-at:     block-height
      }
    )

    (map-set agent-id-to-principal { agent-id: agent-id } { agent: caller })
    (map-set agent-skill-count { agent: caller } { count: skill-count })
    (fold write-skill-at-index skills { agent: caller, index: u0 })

    (ok agent-id)
  )
)

(define-public (update-agent
    (endpoint    (string-utf8 256))
    (description (string-utf8 512))
    (price       uint)
    (currency    uint)
  )
  (let (
    (caller tx-sender)
    (existing (unwrap! (map-get? agents { agent: caller }) ERR-NOT-REGISTERED))
  )
    (asserts! (not (is-eq (get status existing) STATUS-BANNED)) ERR-AGENT-BANNED)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (is-valid-currency currency) ERR-INVALID-CURRENCY)
    (asserts! (> (len endpoint) u0) ERR-INVALID-ENDPOINT)

    (map-set agents
      { agent: caller }
      (merge existing {
        endpoint:      endpoint,
        description:   description,
        price-per-job: price,
        currency:      currency,
        updated-at:    block-height
      })
    )
    (ok true)
  )
)

(define-public (pause-agent)
  (let (
    (caller tx-sender)
    (existing (unwrap! (map-get? agents { agent: caller }) ERR-NOT-REGISTERED))
  )
    (asserts! (not (is-eq (get status existing) STATUS-BANNED)) ERR-AGENT-BANNED)
    (map-set agents { agent: caller }
      (merge existing { status: STATUS-PAUSED, updated-at: block-height }))
    (ok true)
  )
)

(define-public (resume-agent)
  (let (
    (caller tx-sender)
    (existing (unwrap! (map-get? agents { agent: caller }) ERR-NOT-REGISTERED))
  )
    (asserts! (not (is-eq (get status existing) STATUS-BANNED)) ERR-AGENT-BANNED)
    (map-set agents { agent: caller }
      (merge existing { status: STATUS-ACTIVE, updated-at: block-height }))
    (ok true)
  )
)

(define-public (ban-agent (agent principal))
  (let ((existing (unwrap! (map-get? agents { agent: agent }) ERR-NOT-REGISTERED)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (map-set agents { agent: agent }
      (merge existing { status: STATUS-BANNED, updated-at: block-height }))
    (ok true)
  )
)

(define-public (reinstate-agent (agent principal))
  (let ((existing (unwrap! (map-get? agents { agent: agent }) ERR-NOT-REGISTERED)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (map-set agents { agent: agent }
      (merge existing { status: STATUS-ACTIVE, updated-at: block-height }))
    (ok true)
  )
)

(define-read-only (get-agent (agent principal))
  (map-get? agents { agent: agent })
)

(define-read-only (get-agent-by-id (agent-id uint))
  (match (map-get? agent-id-to-principal { agent-id: agent-id })
    entry (map-get? agents { agent: (get agent entry) })
    none
  )
)

(define-read-only (get-agent-skill (agent principal) (index uint))
  (map-get? agent-skills { agent: agent, index: index })
)

(define-read-only (get-agent-skill-count (agent principal))
  (default-to u0 (get count (map-get? agent-skill-count { agent: agent })))
)

(define-read-only (is-agent-available (agent principal))
  (match (map-get? agents { agent: agent })
    entry (is-eq (get status entry) STATUS-ACTIVE)
    false
  )
)

(define-read-only (get-agent-price (agent principal))
  (match (map-get? agents { agent: agent })
    entry (some { price: (get price-per-job entry), currency: (get currency entry) })
    none
  )
)

(define-read-only (get-total-agents)
  (var-get total-agents)
)

(define-read-only (get-agent-endpoint (agent principal))
  (match (map-get? agents { agent: agent })
    entry (some (get endpoint entry))
    none
  )
)

(define-read-only (get-principal-by-id (agent-id uint))
  (map-get? agent-id-to-principal { agent-id: agent-id })
)
