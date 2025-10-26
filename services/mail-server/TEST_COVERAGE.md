# Test Coverage Report

**Generated:** 2025-10-26
**Test Framework:** Jest 30.2.0
**Test Suites:** 5 (3 passing, 2 failing)
**Tests:** 47 (31 passing, 16 failing)

## Overall Coverage

| Metric     | Coverage |
|------------|----------|
| Statements | 42.40%   |
| Branches   | 30.37%   |
| Functions  | 34.14%   |
| Lines      | 43.05%   |

## Coverage by Module

### API Server
| File      | Statements | Branches | Functions | Lines  | Uncovered Lines |
|-----------|------------|----------|-----------|--------|-----------------|
| server.js | 74.83%     | 77.41%   | 53.84%    | 74.83% | 98,103-104,139-140,180-181,216,226,259-260,291,308,334-351,359-407 |

### Database
| File      | Statements | Branches | Functions | Lines  | Uncovered Lines |
|-----------|------------|----------|-----------|--------|-----------------|
| emails.js | 30.30%     | 45.83%   | 38.46%    | 30.30% | 53-126 |
| schema.js | 92.30%     | 50.00%   | 100.00%   | 92.30% | 13 |
| users.js  | 85.71%     | 100.00%  | 80.00%    | 85.18% | 65-73 |

### SMTP
| File      | Statements | Branches | Functions | Lines  |
|-----------|------------|----------|-----------|--------|
| server.js | 0.00%      | 0.00%    | 0.00%     | 0.00%  |

### Utils
| File          | Statements | Branches | Functions | Lines  |
|---------------|------------|----------|-----------|--------|
| spamFilter.js | 0.00%      | 0.00%    | 0.00%     | 0.00%  |

## Test Suites

1. **auth.test.js** - Authentication (8 tests, passing)
2. **rateLimiting.test.js** - Rate limiting (6 tests, passing)
3. **security.test.js** - Security headers (11 tests, passing)
4. **emails.test.js** - Email operations (17 tests, 14 failing)
5. **xssSecurity.test.js** - XSS protection (5 tests, 2 failing)

## Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```
