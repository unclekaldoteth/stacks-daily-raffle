;; Daily Raffle Smart Contract
;; A decentralized lottery where users buy tickets and a winner takes the pot

;; ============================================
;; Constants
;; ============================================

;; Ticket price: 1 STX (1,000,000 microSTX)
(define-constant TICKET-PRICE u1000000)

;; Contract owner (deployer)
(define-constant CONTRACT-OWNER tx-sender)

;; Dev fee percentage (5% = 500 basis points)
(define-constant DEV-FEE-BPS u500)
(define-constant BPS-DENOMINATOR u10000)

;; Minimum blocks before drawing is allowed (prevents same-block manipulation)
(define-constant MIN-BLOCKS-BEFORE-DRAW u10)

;; ============================================
;; Error Codes
;; ============================================

(define-constant ERR-NOT-OWNER (err u100))
(define-constant ERR-NO-TICKETS-SOLD (err u101))
(define-constant ERR-TRANSFER-FAILED (err u102))
(define-constant ERR-ALREADY-DRAWN (err u103))
(define-constant ERR-TOO-EARLY-TO-DRAW (err u104))
(define-constant ERR-INVALID-TICKET-ID (err u105))
(define-constant ERR-ROUND-NOT-FOUND (err u106))
(define-constant ERR-NO-PRIZE-TO-CLAIM (err u107))
(define-constant ERR-ALREADY-CLAIMED (err u108))

;; ============================================
;; Data Variables
;; ============================================

;; Current round number
(define-data-var current-round uint u1)

;; Block height when round started
(define-data-var round-start-block uint block-height)

;; ============================================
;; Data Maps
;; ============================================

;; Map ticket-id to owner for each round
(define-map Tickets
  { round: uint, ticket-id: uint }
  { owner: principal }
)

;; Round information
(define-map Round-Info
  uint
  {
    tickets-sold: uint,
    unique-players: uint,
    pot-balance: uint,
    winner: (optional principal),
    is-drawn: bool,
    draw-block: uint,
    prize-amount: uint,
    is-claimed: bool
  }
)

;; User tickets per round
(define-map User-Tickets
  { round: uint, user: principal }
  { count: uint }
)

;; Unclaimed prizes for winners
(define-map Unclaimed-Prizes
  principal
  { amount: uint, round: uint }
)

;; ============================================
;; Private Functions
;; ============================================

;; Get current round info or default
(define-private (get-current-round-info)
  (default-to
    {
      tickets-sold: u0,
      unique-players: u0,
      pot-balance: u0,
      winner: none,
      is-drawn: false,
      draw-block: u0,
      prize-amount: u0,
      is-claimed: false
    }
    (map-get? Round-Info (var-get current-round))
  )
)

;; Calculate dev fee from pot
(define-private (calculate-dev-fee (amount uint))
  (/ (* amount DEV-FEE-BPS) BPS-DENOMINATOR)
)

;; Generate pseudo-random number using block hash
(define-private (get-random-seed (target-block uint))
  (match (get-burn-block-info? header-hash target-block)
    hash-value (some (buff-to-uint hash-value))
    none
  )
)

;; Convert 32-byte buffer to uint using first 8 bytes (big-endian)
(define-private (buff-to-uint (hash (buff 32)))
  (+
    (* (buff-to-u8 (unwrap-panic (element-at hash u0))) u72057594037927936)
    (* (buff-to-u8 (unwrap-panic (element-at hash u1))) u281474976710656)
    (* (buff-to-u8 (unwrap-panic (element-at hash u2))) u1099511627776)
    (* (buff-to-u8 (unwrap-panic (element-at hash u3))) u4294967296)
    (* (buff-to-u8 (unwrap-panic (element-at hash u4))) u16777216)
    (* (buff-to-u8 (unwrap-panic (element-at hash u5))) u65536)
    (* (buff-to-u8 (unwrap-panic (element-at hash u6))) u256)
    (buff-to-u8 (unwrap-panic (element-at hash u7)))
  )
)

;; Convert single byte to uint
(define-private (buff-to-u8 (byte (buff 1)))
  (unwrap-panic (index-of 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff byte))
)

;; ============================================
;; Public Functions
;; ============================================

;; Buy a ticket for the current round
(define-public (buy-ticket)
  (let
    (
      (round (var-get current-round))
      (round-info (get-current-round-info))
      (new-ticket-id (+ (get tickets-sold round-info) u1))
      (user-ticket-info (default-to { count: u0 } (map-get? User-Tickets { round: round, user: tx-sender })))
      (is-new-player (is-eq (get count user-ticket-info) u0))
    )
    (try! (stx-transfer? TICKET-PRICE tx-sender (as-contract tx-sender)))
    
    (map-set Tickets
      { round: round, ticket-id: new-ticket-id }
      { owner: tx-sender }
    )
    
    (map-set Round-Info round
      {
        tickets-sold: new-ticket-id,
        unique-players: (if is-new-player 
                          (+ (get unique-players round-info) u1) 
                          (get unique-players round-info)),
        pot-balance: (+ (get pot-balance round-info) TICKET-PRICE),
        winner: none,
        is-drawn: false,
        draw-block: u0,
        prize-amount: u0,
        is-claimed: false
      }
    )
    
    (map-set User-Tickets
      { round: round, user: tx-sender }
      { count: (+ (get count user-ticket-info) u1) }
    )
    
    (ok { ticket-id: new-ticket-id, round: round })
  )
)

;; Buy multiple tickets at once
(define-public (buy-tickets (quantity uint))
  (let
    (
      (round (var-get current-round))
      (round-info (get-current-round-info))
      (total-cost (* TICKET-PRICE quantity))
      (start-ticket-id (+ (get tickets-sold round-info) u1))
      (user-ticket-info (default-to { count: u0 } (map-get? User-Tickets { round: round, user: tx-sender })))
      (is-new-player (is-eq (get count user-ticket-info) u0))
    )
    (try! (stx-transfer? total-cost tx-sender (as-contract tx-sender)))
    
    (fold register-ticket-fold
      (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10)
      { start-id: start-ticket-id, round: round, quantity: quantity, registered: u0 }
    )
    
    (map-set Round-Info round
      {
        tickets-sold: (+ (get tickets-sold round-info) quantity),
        unique-players: (if is-new-player 
                          (+ (get unique-players round-info) u1) 
                          (get unique-players round-info)),
        pot-balance: (+ (get pot-balance round-info) total-cost),
        winner: none,
        is-drawn: false,
        draw-block: u0,
        prize-amount: u0,
        is-claimed: false
      }
    )
    
    (map-set User-Tickets
      { round: round, user: tx-sender }
      { count: (+ (get count user-ticket-info) quantity) }
    )
    
    (ok { tickets-bought: quantity, round: round })
  )
)

;; Helper fold function to register multiple tickets
(define-private (register-ticket-fold 
  (index uint) 
  (state { start-id: uint, round: uint, quantity: uint, registered: uint })
)
  (if (< (get registered state) (get quantity state))
    (begin
      (map-set Tickets
        { round: (get round state), ticket-id: (+ (get start-id state) (get registered state)) }
        { owner: tx-sender }
      )
      { 
        start-id: (get start-id state), 
        round: (get round state), 
        quantity: (get quantity state), 
        registered: (+ (get registered state) u1) 
      }
    )
    state
  )
)

;; Draw the winner for the current round (only owner can call)
(define-public (draw-winner)
  (let
    (
      (round (var-get current-round))
      (round-info (get-current-round-info))
      (tickets-sold (get tickets-sold round-info))
      (unique-players (get unique-players round-info))
      (pot-balance (get pot-balance round-info))
      (blocks-elapsed (- block-height (var-get round-start-block)))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-OWNER)
    (asserts! (> tickets-sold u0) ERR-NO-TICKETS-SOLD)
    (asserts! (not (get is-drawn round-info)) ERR-ALREADY-DRAWN)
    (asserts! (>= blocks-elapsed MIN-BLOCKS-BEFORE-DRAW) ERR-TOO-EARLY-TO-DRAW)
    
    (let
      (
        (random-seed (unwrap! (get-random-seed (- burn-block-height u1)) ERR-ROUND-NOT-FOUND))
        (winning-ticket-id (+ (mod random-seed tickets-sold) u1))
        (winner-data (unwrap! (map-get? Tickets { round: round, ticket-id: winning-ticket-id }) ERR-INVALID-TICKET-ID))
        (winner (get owner winner-data))
        (dev-fee (calculate-dev-fee pot-balance))
        (winner-prize (- pot-balance dev-fee))
      )
      
      (try! (as-contract (stx-transfer? dev-fee tx-sender CONTRACT-OWNER)))
      
      (map-set Unclaimed-Prizes winner
        { amount: winner-prize, round: round }
      )
      
      (map-set Round-Info round
        {
          tickets-sold: tickets-sold,
          unique-players: unique-players,
          pot-balance: winner-prize,
          winner: (some winner),
          is-drawn: true,
          draw-block: block-height,
          prize-amount: winner-prize,
          is-claimed: false
        }
      )
      
      (var-set current-round (+ round u1))
      (var-set round-start-block block-height)
      
      (print { 
        event: "winner-drawn",
        winner: winner, 
        prize: winner-prize, 
        winning-ticket: winning-ticket-id,
        round: round 
      })
      
      (ok { 
        winner: winner, 
        prize: winner-prize, 
        winning-ticket: winning-ticket-id,
        round: round 
      })
    )
  )
)

;; Claim prize - winners call this to receive their STX
(define-public (claim-prize)
  (let
    (
      (prize-info (unwrap! (map-get? Unclaimed-Prizes tx-sender) ERR-NO-PRIZE-TO-CLAIM))
      (prize-amount (get amount prize-info))
      (prize-round (get round prize-info))
    )
    (try! (as-contract (stx-transfer? prize-amount tx-sender tx-sender)))
    
    (map-delete Unclaimed-Prizes tx-sender)
    
    (match (map-get? Round-Info prize-round)
      round-data 
      (map-set Round-Info prize-round
        (merge round-data { is-claimed: true, pot-balance: u0 })
      )
      true
    )
    
    (print {
      event: "prize-claimed",
      winner: tx-sender,
      amount: prize-amount,
      round: prize-round
    })
    
    (ok { amount: prize-amount, round: prize-round })
  )
)

;; ============================================
;; Read-Only Functions
;; ============================================

(define-read-only (get-current-round)
  (var-get current-round)
)

(define-read-only (get-ticket-price)
  TICKET-PRICE
)

(define-read-only (get-pot-balance)
  (get pot-balance (get-current-round-info))
)

(define-read-only (get-tickets-sold)
  (get tickets-sold (get-current-round-info))
)

(define-read-only (get-unique-players)
  (get unique-players (get-current-round-info))
)

(define-read-only (get-user-ticket-count (user principal))
  (default-to u0 
    (get count 
      (map-get? User-Tickets { round: (var-get current-round), user: user })
    )
  )
)

(define-read-only (get-round-info (round uint))
  (map-get? Round-Info round)
)

(define-read-only (get-last-winner)
  (let
    (
      (current (var-get current-round))
    )
    (if (> current u1)
      (match (map-get? Round-Info (- current u1))
        round-data (get winner round-data)
        none
      )
      none
    )
  )
)

(define-read-only (get-ticket-owner (round uint) (ticket-id uint))
  (match (map-get? Tickets { round: round, ticket-id: ticket-id })
    ticket-data (some (get owner ticket-data))
    none
  )
)

(define-read-only (get-contract-owner)
  CONTRACT-OWNER
)

(define-read-only (get-blocks-until-draw)
  (let
    (
      (blocks-elapsed (- block-height (var-get round-start-block)))
    )
    (if (>= blocks-elapsed MIN-BLOCKS-BEFORE-DRAW)
      u0
      (- MIN-BLOCKS-BEFORE-DRAW blocks-elapsed)
    )
  )
)

(define-read-only (can-draw)
  (let
    (
      (round-info (get-current-round-info))
      (blocks-elapsed (- block-height (var-get round-start-block)))
    )
    (and
      (> (get tickets-sold round-info) u0)
      (not (get is-drawn round-info))
      (>= blocks-elapsed MIN-BLOCKS-BEFORE-DRAW)
    )
  )
)

(define-read-only (get-estimated-prize)
  (let
    (
      (pot-balance (get pot-balance (get-current-round-info)))
      (dev-fee (calculate-dev-fee pot-balance))
    )
    (- pot-balance dev-fee)
  )
)

(define-read-only (get-unclaimed-prize (user principal))
  (map-get? Unclaimed-Prizes user)
)

(define-read-only (has-unclaimed-prize (user principal))
  (is-some (map-get? Unclaimed-Prizes user))
)
