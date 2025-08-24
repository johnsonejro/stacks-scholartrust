# Scholar Trust 🎓

A milestone-based scholarship fund management system built on Stacks blockchain using Clarity smart contracts.

## Overview

Scholar Trust enables donors to create scholarship pools where funds are locked and released incrementally as students meet academic milestones (GPA requirements). This trustless system ensures accountability while protecting both donors and students.

## Key Features

- **🏦 Scholarship Pools**: Donors fund pools with semester-based distributions
- **📊 Milestone Verification**: Oracle-verified GPA tracking for fund releases  
- **💰 Automated Payments**: Semester-based STX payments when requirements are met
- **🛡️ Emergency Recovery**: Donors can recover funds if students fail requirements
- **👥 Oracle Management**: Authorized oracles verify student achievements

## How It Works

1. **Pool Creation**: Donor creates scholarship pool with GPA requirements and semester amounts
2. **Milestone Verification**: Authorized oracle verifies student's GPA each semester
3. **Fund Release**: Funds automatically released when GPA meets requirements
4. **Emergency Exit**: Donor can withdraw if student fails to meet milestones

## Contract Functions

### Core Operations
- `create-scholarship-pool`: Fund new scholarship with requirements
- `verify-milestone`: Oracle verification of student GPA
- `release-semester-funds`: Release funds for verified semester
- `emergency-withdrawal`: Donor fund recovery

### Management
- `add-oracle` / `remove-oracle`: Manage authorized verifiers
- `get-pool-info`: Query scholarship pool details
- `get-milestone-verification`: Check verification status

## Getting Started

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) for development
- Node.js for testing

### Development
```bash
# Clone repository
git clone https://github.com/johnsonejro/stacks-scholartrust
cd stacks-scholartrust/scholartrust

# Check contract
clarinet check

# Run tests
npm test
```

### Example Usage
```clarity
;; Create scholarship pool (4 semesters, 3.5 GPA requirement, 1000 STX per semester)
(contract-call? .scholar_trust create-scholarship-pool 
  'ST1STUDENT... ;; student principal
  u350          ;; 3.5 GPA (scaled by 100)
  u4            ;; 4 semesters
  u1000000000   ;; 1000 STX per semester (in microSTX)
)

;; Oracle verifies 3.7 GPA for semester 1
(contract-call? .scholar_trust verify-milestone 
  u1   ;; pool-id
  u1   ;; semester
  u370 ;; 3.7 GPA
)

;; Release funds for verified semester
(contract-call? .scholar_trust release-semester-funds u1 u1)
```

## Economic Model

- **GPA Scale**: GPA × 100 (e.g., 3.50 GPA = 350)
- **Fund Locking**: Total amount locked at pool creation
- **Sequential Release**: Funds released semester by semester
- **Donor Protection**: Emergency withdrawal if requirements not met

## Security

- ✅ Oracle authorization controls
- ✅ Input validation for all parameters  
- ✅ Sequential milestone verification
- ✅ Double-spend protection
- ✅ Proper STX transfer handling

## Project Structure

```
scholartrust/
├── contracts/
│   └── scholar_trust.clar     # Main contract
├── tests/
│   └── scholar_trust.test.ts  # Test suite
├── settings/
│   ├── Devnet.toml
│   ├── Testnet.toml
│   └── Mainnet.toml
├── Clarinet.toml
└── package.json
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

Built with ❤️ for educational accessibility on Stacks blockchain.

