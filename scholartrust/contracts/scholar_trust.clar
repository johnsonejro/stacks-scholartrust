;; title: scholar_trust
;; version: 1.0.0
;; summary: Milestone-based scholarship fund management system
;; description: A Clarity contract that allows donors to create "Scholarship Trust Pools" 
;;              where funds are locked until milestones are met and released in stages

;; traits
;;

;; token definitions
;;

;; constants
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-POOL-NOT-FOUND (err u101))
(define-constant ERR-INSUFFICIENT-FUNDS (err u102))
(define-constant ERR-MILESTONE-NOT-MET (err u103))
(define-constant ERR-ALREADY-CLAIMED (err u104))
(define-constant ERR-INVALID-AMOUNT (err u105))
(define-constant ERR-INVALID-STUDENT (err u106))
(define-constant ERR-ORACLE-NOT-AUTHORIZED (err u107))

(define-constant CONTRACT-OWNER tx-sender)

;; data vars
(define-data-var pool-counter uint u0)

;; data maps
;; Oracle principals (authorized to verify milestones)
(define-map oracles
    principal
    bool
)

;; Scholarship pool structure
(define-map scholarship-pools
    { pool-id: uint }
    {
        donor: principal,
        total-amount: uint,
        remaining-amount: uint,
        student: principal,
        required-gpa: uint, ;; GPA * 100 (e.g., 3.50 = 350)
        total-semesters: uint,
        amount-per-semester: uint,
        semesters-released: uint,
        created-at: uint,
        active: bool,
    }
)

;; Milestone verification records
(define-map milestone-verifications
    {
        pool-id: uint,
        semester: uint,
    }
    {
        gpa: uint, ;; GPA * 100
        verified-by: principal,
        verified-at: uint,
        released: bool,
    }
)

;; public functions
;; Initialize contract with owner as first oracle
(map-set oracles CONTRACT-OWNER true)

;; Oracle management functions
(define-public (add-oracle (oracle principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (ok (map-set oracles oracle true))
    )
)

(define-public (remove-oracle (oracle principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
        (ok (map-delete oracles oracle))
    )
)

;; read only functions
(define-read-only (is-oracle (oracle principal))
    (default-to false (map-get? oracles oracle))
)

(define-read-only (get-pool-counter)
    (var-get pool-counter)
)

(define-read-only (get-contract-info)
    {
        name: "Scholar Trust",
        version: "1.0.0",
        description: "Milestone-based scholarship fund management system",
    }
)

;; private functions
;;
