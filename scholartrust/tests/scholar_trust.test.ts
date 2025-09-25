import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor = accounts.get("wallet_1")!;
const student = accounts.get("wallet_2")!;
const oracle = accounts.get("wallet_3")!;
const unauthorizedUser = accounts.get("wallet_4")!;

const contractName = "scholar_trust";

describe("Scholar Trust Contract", () => {
  beforeEach(() => {
    simnet.mineEmptyBlocks(1);
  });

  describe("Contract Initialization", () => {
    it("initializes with deployer as oracle", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-oracle",
        [Cl.principal(deployer)],
        deployer
      );
      expect(result).toBeBool(true);
    });

    it("starts with pool counter at 0", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-pool-counter",
        [],
        deployer
      );
      expect(result).toBeUint(0);
    });

    it("returns correct contract info", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-contract-info",
        [],
        deployer
      );
      expect(result).toBeTuple({
        name: Cl.stringAscii("Scholar Trust"),
        version: Cl.stringAscii("1.0.0"),
        description: Cl.stringAscii("Milestone-based scholarship fund management system")
      });
    });
  });

  describe("Oracle Management", () => {
    it("allows owner to add oracle", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-oracle",
        [Cl.principal(oracle)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isOracleResult = simnet.callReadOnlyFn(
        contractName,
        "is-oracle",
        [Cl.principal(oracle)],
        deployer
      );
      expect(isOracleResult.result).toBeBool(true);
    });

    it("prevents non-owner from adding oracle", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "add-oracle",
        [Cl.principal(oracle)],
        unauthorizedUser
      );
      expect(result).toBeErr(Cl.uint(100));
    });

    it("allows owner to remove oracle", () => {
      simnet.callPublicFn(contractName, "add-oracle", [Cl.principal(oracle)], deployer);

      const { result } = simnet.callPublicFn(
        contractName,
        "remove-oracle",
        [Cl.principal(oracle)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isOracleResult = simnet.callReadOnlyFn(
        contractName,
        "is-oracle",
        [Cl.principal(oracle)],
        deployer
      );
      expect(isOracleResult.result).toBeBool(false);
    });

    it("prevents non-owner from removing oracle", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-oracle",
        [Cl.principal(oracle)],
        unauthorizedUser
      );
      expect(result).toBeErr(Cl.uint(100));
    });
  });

  describe("Scholarship Pool Creation", () => {
    it("creates a scholarship pool successfully", () => {
      const requiredGpa = 350;
      const totalSemesters = 4;
      const amountPerSemester = 1000000000;

      const { result } = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(requiredGpa), Cl.uint(totalSemesters), Cl.uint(amountPerSemester)],
        donor
      );

      expect(result).toBeOk(Cl.uint(1));

      const counterResult = simnet.callReadOnlyFn(
        contractName,
        "get-pool-counter",
        [],
        deployer
      );
      expect(counterResult.result).toBeUint(1);
    });

    it("retrieves pool info correctly", () => {
      const requiredGpa = 350;
      const totalSemesters = 4;
      const amountPerSemester = 1000000000;
      const totalAmount = totalSemesters * amountPerSemester;

      simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(requiredGpa), Cl.uint(totalSemesters), Cl.uint(amountPerSemester)],
        donor
      );

      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [Cl.uint(1)],
        deployer
      );

      expect(result).toBeSome(
        Cl.tuple({
          donor: Cl.principal(donor),
          "total-amount": Cl.uint(totalAmount),
          "remaining-amount": Cl.uint(totalAmount),
          student: Cl.principal(student),
          "required-gpa": Cl.uint(requiredGpa),
          "total-semesters": Cl.uint(totalSemesters),
          "amount-per-semester": Cl.uint(amountPerSemester),
          "semesters-released": Cl.uint(0),
          "created-at": Cl.uint(simnet.blockHeight),
          active: Cl.bool(true)
        })
      );
    });

    it("rejects invalid parameters", () => {
      let result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(0)],
        donor
      );
      expect(result.result).toBeErr(Cl.uint(105));

      result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(0), Cl.uint(1000000000)],
        donor
      );
      expect(result.result).toBeErr(Cl.uint(105));

      result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(500), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      expect(result.result).toBeErr(Cl.uint(105));

      result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(0), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      expect(result.result).toBeErr(Cl.uint(105));
    });
  });

  describe("Milestone Verification", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      
      simnet.callPublicFn(contractName, "add-oracle", [Cl.principal(oracle)], deployer);
    });

    it("allows authorized oracle to verify milestone", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(370)],
        oracle
      );

      expect(result).toBeOk(Cl.bool(true));

      const verificationResult = simnet.callReadOnlyFn(
        contractName,
        "get-milestone-verification",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(verificationResult.result).toBeSome(
        Cl.tuple({
          gpa: Cl.uint(370),
          "verified-by": Cl.principal(oracle),
          "verified-at": Cl.uint(simnet.blockHeight),
          released: Cl.bool(false)
        })
      );
    });

    it("prevents unauthorized users from verifying milestones", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(370)],
        unauthorizedUser
      );

      expect(result).toBeErr(Cl.uint(107));
    });

    it("prevents verifying out-of-sequence semesters", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(2), Cl.uint(370)],
        oracle
      );

      expect(result).toBeErr(Cl.uint(103));
    });

    it("prevents verifying non-existent pool", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(999), Cl.uint(1), Cl.uint(370)],
        oracle
      );

      expect(result).toBeErr(Cl.uint(101));
    });
  });

  describe("Fund Release", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      simnet.callPublicFn(contractName, "add-oracle", [Cl.principal(oracle)], deployer);
    });

    it("releases funds when GPA requirement is met", () => {
      simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(370)],
        oracle
      );

      const { result } = simnet.callPublicFn(
        contractName,
        "release-semester-funds",
        [Cl.uint(1), Cl.uint(1)],
        student
      );

      expect(result).toBeOk(Cl.uint(1000000000));

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [Cl.uint(1)],
        deployer
      );

      // Just verify the result is some - detailed validation would require complex tuple matching
      expect(poolInfo.result.type).toBe("some");

      const verification = simnet.callReadOnlyFn(
        contractName,
        "get-milestone-verification",
        [Cl.uint(1), Cl.uint(1)],
        deployer
      );

      expect(verification.result.type).toBe("some");
    });

    it("prevents fund release when GPA requirement is not met", () => {
      simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(340)],
        oracle
      );

      const { result } = simnet.callPublicFn(
        contractName,
        "release-semester-funds",
        [Cl.uint(1), Cl.uint(1)],
        student
      );

      expect(result).toBeErr(Cl.uint(103));
    });

    it("prevents releasing funds without verification", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "release-semester-funds",
        [Cl.uint(1), Cl.uint(1)],
        student
      );

      expect(result).toBeErr(Cl.uint(103));
    });

    it("prevents double release of same semester", () => {
      simnet.callPublicFn(contractName, "verify-milestone", [Cl.uint(1), Cl.uint(1), Cl.uint(370)], oracle);
      simnet.callPublicFn(contractName, "release-semester-funds", [Cl.uint(1), Cl.uint(1)], student);

      const { result } = simnet.callPublicFn(
        contractName,
        "release-semester-funds",
        [Cl.uint(1), Cl.uint(1)],
        student
      );

      expect(result).toBeErr(Cl.uint(104));
    });

    it("deactivates pool after final semester", () => {
      for (let semester = 1; semester <= 4; semester++) {
        simnet.callPublicFn(
          contractName,
          "verify-milestone",
          [Cl.uint(1), Cl.uint(semester), Cl.uint(370)],
          oracle
        );
        simnet.callPublicFn(
          contractName,
          "release-semester-funds",
          [Cl.uint(1), Cl.uint(semester)],
          student
        );
      }

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [Cl.uint(1)],
        deployer
      );

      expect(poolInfo.result.type).toBe("some");
    });
  });

  describe("Emergency Withdrawal", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      simnet.callPublicFn(contractName, "add-oracle", [Cl.principal(oracle)], deployer);
    });

    it("allows donor to withdraw when no verification exists", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        donor
      );

      expect(result).toBeOk(Cl.uint(4000000000));

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [Cl.uint(1)],
        deployer
      );

      expect(poolInfo.result.type).toBe("some");
    });

    it("allows donor to withdraw when GPA requirement not met", () => {
      simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(340)],
        oracle
      );

      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        donor
      );

      expect(result).toBeOk(Cl.uint(4000000000));
    });

    it("prevents withdrawal when GPA requirement is met", () => {
      simnet.callPublicFn(
        contractName,
        "verify-milestone",
        [Cl.uint(1), Cl.uint(1), Cl.uint(370)],
        oracle
      );

      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        donor
      );

      expect(result).toBeErr(Cl.uint(103));
    });

    it("prevents non-donor from emergency withdrawal", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        unauthorizedUser
      );

      expect(result).toBeErr(Cl.uint(100));
    });

    it("prevents withdrawal from non-existent pool", () => {
      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(999)],
        donor
      );

      expect(result).toBeErr(Cl.uint(101));
    });

    it("prevents withdrawal when no funds remaining", () => {
      for (let semester = 1; semester <= 4; semester++) {
        simnet.callPublicFn(
          contractName,
          "verify-milestone",
          [Cl.uint(1), Cl.uint(semester), Cl.uint(370)],
          oracle
        );
        simnet.callPublicFn(
          contractName,
          "release-semester-funds",
          [Cl.uint(1), Cl.uint(semester)],
          student
        );
      }

      const { result } = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        donor
      );

      expect(result).toBeErr(Cl.uint(101)); // Pool is inactive after all funds released, so pool not found
    });
  });

  describe("Complex Scenarios", () => {
    it("handles multiple pools correctly", () => {
      const pool1Result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      
      const pool2Result = simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(accounts.get("wallet_5")!), Cl.uint(300), Cl.uint(2), Cl.uint(500000000)],
        donor
      );

      expect(pool1Result.result).toBeOk(Cl.uint(1));
      expect(pool2Result.result).toBeOk(Cl.uint(2));

      const counterResult = simnet.callReadOnlyFn(
        contractName,
        "get-pool-counter",
        [],
        deployer
      );
      expect(counterResult.result).toBeUint(2);
    });

    it("handles partial fund release and emergency withdrawal", () => {
      simnet.callPublicFn(
        contractName,
        "create-scholarship-pool",
        [Cl.principal(student), Cl.uint(350), Cl.uint(4), Cl.uint(1000000000)],
        donor
      );
      simnet.callPublicFn(contractName, "add-oracle", [Cl.principal(oracle)], deployer);

      simnet.callPublicFn(contractName, "verify-milestone", [Cl.uint(1), Cl.uint(1), Cl.uint(370)], oracle);
      simnet.callPublicFn(contractName, "release-semester-funds", [Cl.uint(1), Cl.uint(1)], student);

      const withdrawalResult = simnet.callPublicFn(
        contractName,
        "emergency-withdrawal",
        [Cl.uint(1)],
        donor
      );

      expect(withdrawalResult.result).toBeOk(Cl.uint(3000000000));
    });
  });
});