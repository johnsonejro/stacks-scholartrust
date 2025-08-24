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

;; Create a new scholarship pool
(define-public (create-scholarship-pool
        (student principal)
        (required-gpa uint)
        (total-semesters uint)
        (amount-per-semester uint)
    )
    (let (
            (pool-id (+ (var-get pool-counter) u1))
            (total-amount (* total-semesters amount-per-semester))
        )
        (asserts! (> amount-per-semester u0) ERR-INVALID-AMOUNT)
        (asserts! (> total-semesters u0) ERR-INVALID-AMOUNT)
        (asserts! (> required-gpa u0) ERR-INVALID-AMOUNT)
        (asserts! (<= required-gpa u400) ERR-INVALID-AMOUNT)
        ;; Max GPA 4.0

        (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))

        (map-set scholarship-pools { pool-id: pool-id } {
            donor: tx-sender,
            total-amount: total-amount,
            remaining-amount: total-amount,
            student: student,
            required-gpa: required-gpa,
            total-semesters: total-semesters,
            amount-per-semester: amount-per-semester,
            semesters-released: u0,
            created-at: stacks-block-height,
            active: true,
        })

        (var-set pool-counter pool-id)
        (ok pool-id)
    )
)

;; Verify milestone (GPA) for a semester
(define-public (verify-milestone
        (pool-id uint)
        (semester uint)
        (student-gpa uint)
    )
    (let ((pool (unwrap! (map-get? scholarship-pools { pool-id: pool-id })
            ERR-POOL-NOT-FOUND
        )))
        (asserts! (is-oracle tx-sender) ERR-ORACLE-NOT-AUTHORIZED)
        (asserts! (get active pool) ERR-POOL-NOT-FOUND)
        (asserts! (is-eq semester (+ (get semesters-released pool) u1))
            ERR-MILESTONE-NOT-MET
        )
        (asserts! (<= semester (get total-semesters pool)) ERR-MILESTONE-NOT-MET)

        (map-set milestone-verifications {
            pool-id: pool-id,
            semester: semester,
        } {
            gpa: student-gpa,
            verified-by: tx-sender,
            verified-at: stacks-block-height,
            released: false,
        })

        (ok true)
    )
)

;; read only functions
(define-read-only (is-oracle (oracle principal))
    (default-to false (map-get? oracles oracle))
)

(define-read-only (get-pool-counter)
    (var-get pool-counter)
)

(define-read-only (get-pool-info (pool-id uint))
    (map-get? scholarship-pools { pool-id: pool-id })
)

(define-read-only (get-milestone-verification
        (pool-id uint)
        (semester uint)
    )
    (map-get? milestone-verifications {
        pool-id: pool-id,
        semester: semester,
    })
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
