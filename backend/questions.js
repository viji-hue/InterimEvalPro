// ─────────────────────────────────────────────────────────────────
// QUESTION BANK — server-side only, never exposed to frontend
// Questions are picked randomly per session by the server.
// Only the question text is sent to the trainee — the model
// answer (key) stays on the server and is only used for AI eval.
// ─────────────────────────────────────────────────────────────────

export const QUESTION_BANK = [
  // ── CORE JAVA ─────────────────────────────────────────────────
  {
    id: "cj1",
    topic: "Core Java",
    difficulty: "medium",
    q: "What is the difference between `==` and `.equals()` in Java? Give a real-world example where using `==` would cause a bug in Selenium test code.",
    key: "== compares object references (memory address) while .equals() compares object content/value. Example: String s1 = new String('pass'); String s2 = new String('pass'); s1==s2 is false but s1.equals(s2) is true. In Selenium, using == to compare expected vs actual text in assertions would fail even when values match, because WebDriver returns a new String object each time getText() is called.",
    detailedAnswer: "REAL-WORLD SCENARIO: You're testing a login dashboard. After successful login, the welcome message displays 'Login Successful'. Your test fetches this message twice to verify it's consistent:\n\nWRONG APPROACH:\n```\nString actual1 = driver.findElement(By.id('msg')).getText();\nString actual2 = driver.findElement(By.id('msg')).getText();\nassert actual1 == actual2; // ❌ FAILS!\n```\n\nWHY IT FAILS: Each getText() call returns a NEW String object in memory with a different address. Even though both contain 'Login Successful', the == operator compares memory addresses (references), not content.\n\nCORRECT APPROACH:\n```\nassert actual1.equals(actual2); // ✓ PASSES\nassert actual1.equals('Login Successful'); // ✓ PASSES\n```\n\nThis bug is insidious because the test LOOKS correct but fails unpredictably. This is why companies use helper methods: `assertEquals(driver.findElement(By.id('title')).getText(), expectedTitle);` (JUnit/TestNG handles equals() internally).",
    evalHints: ["reference vs value comparison", "new String()", "getText()", "assertion bug", "equals method"]
  },
  {
    id: "cj2",
    topic: "Core Java",
    difficulty: "medium",
    q: "Explain method overloading vs method overriding with examples. How does this apply in Selenium Page Object Models?",
    key: "Overloading: same method name, different parameters in same class — e.g. click(By locator) and click(WebElement el). Overriding: subclass redefines parent method — e.g. DashboardPage extends BasePage and overrides getPageTitle(). In POM, BasePage has generic methods and child pages override them with page-specific behavior. Overloading is used for utility methods that handle different input types.",
    evalHints: ["same class different parameters", "subclass parent", "BasePage", "override", "POM", "compile time vs runtime"]
  },
  {
    id: "cj3",
    topic: "Core Java",
    difficulty: "hard",
    q: "What are checked vs unchecked exceptions? How should a robust Selenium framework handle NoSuchElementException?",
    key: "Checked exceptions must be declared or caught at compile time (IOException, InterruptedException). Unchecked extend RuntimeException and don't require explicit handling (NoSuchElementException, NullPointerException). In Selenium framework: wrap element interactions in a helper method, catch NoSuchElementException, log the failure with locator details, take a screenshot, and either throw a custom FrameworkException or return false — never swallow the exception silently.",
    evalHints: ["compile time", "RuntimeException", "catch block", "custom exception", "screenshot", "log"]
  },
  {
    id: "cj4",
    topic: "Core Java",
    difficulty: "easy",
    q: "Explain ArrayList vs LinkedList. When would you prefer one over the other in a test automation framework?",
    key: "ArrayList uses dynamic array — O(1) random access, O(n) insert/delete. LinkedList uses doubly linked list — O(1) insert/delete, O(n) random access. In test frameworks: use ArrayList for storing test results, test data rows, or WebElement lists where you iterate or access by index. Use LinkedList as a queue of test steps to execute sequentially — add to end, remove from front.",
    evalHints: ["dynamic array", "doubly linked", "O(1)", "random access", "test data", "queue"]
  },
  {
    id: "cj5",
    topic: "Core Java",
    difficulty: "medium",
    q: "What is the `static` keyword in Java? Explain how it is used to implement a WebDriver singleton pattern with thread safety.",
    key: "static belongs to class, shared across all instances. In WebDriver singleton: private static WebDriver driver; private static ThreadLocal<WebDriver> threadLocalDriver = new ThreadLocal<>() for parallel tests. getInstance() checks if driver is null, creates new ChromeDriver if so, returns existing driver otherwise. ThreadLocal ensures each thread gets its own driver instance, preventing cross-thread contamination in parallel test runs.",
    evalHints: ["class level", "ThreadLocal", "null check", "getInstance", "parallel", "singleton"]
  },
  {
    id: "cj6",
    topic: "Core Java",
    difficulty: "hard",
    q: "What is the difference between interface and abstract class in Java? How does this design choice affect a Selenium framework's BasePage?",
    key: "Interface: all methods abstract (Java 8+ allows default/static), supports multiple inheritance, no constructor. Abstract class: can have concrete methods, single inheritance, has constructors. For BasePage, use abstract class because: it needs a constructor to accept WebDriver, has concrete reusable methods (waitForElement, scrollTo), and child pages extend it. Use interfaces for defining contracts like Navigable or Verifiable that any page class can implement regardless of hierarchy.",
    evalHints: ["multiple inheritance", "constructor", "abstract method", "concrete method", "BasePage extends", "interface implements"]
  },

  // ── FUNCTIONAL TESTING ────────────────────────────────────────
  {
    id: "ft1",
    topic: "Functional Testing",
    difficulty: "easy",
    q: "What is the difference between black-box and white-box testing? Which approach applies when testing a web application login module and why?",
    key: "Black-box: tests functionality without knowledge of internal code — focuses on inputs/outputs. White-box: tests internal logic with code access — focuses on branches and paths. For login module, black-box is used — testers verify behavior (valid credentials → session created, invalid → error message, empty → validation, locked account → specific error) without knowing the authentication implementation, hashing algorithm, or database queries used.",
    detailedAnswer: "REAL-WORLD SCENARIO: You're a fresh QA analyst joining a fintech startup. The team asks you to test the login feature.\n\nBLACK-BOX TESTING (Your Role):\n- You test as an END USER with NO code access\n- Test cases:\n  1. Valid credentials (user@test.com / password123) → Login succeeds, dashboard loads\n  2. Invalid password → Error message: 'Incorrect password'\n  3. Unregistered email → Error message: 'Email not found'\n  4. Empty fields → Error message: 'All fields required'\n  5. Account locked after 5 failed attempts → Error message: 'Account locked. Contact support'\n  6. SQL injection attempt: user' OR '1'='1 → Login fails safely\n  7. Single quote in password → Login works (edge case)\n\nWHITE-BOX TESTING (Senior Developer's Role):\n- Developers with code access verify:\n  - Password hashing algorithm (bcryptjs, not plain text)\n  - Token generation (JWT expiry = 24h)\n  - SQL query uses parameterized queries (prevents injection)\n  - Failed login attempts logged to audit table\n  - Session cookie has HttpOnly and Secure flags\n\nWHY BLACK-BOX FOR LOGIN:\n- You don't need to know the backend implementation\n- Impossible to remember 100 security checks as a tester\n- Code implementation can change; behavior expectations don't\n- You test the CONTRACT: 'if credentials are valid, user logs in'\n\nFULL COVERAGE: Combine both — Black-box catches behavior issues, white-box catches security issues. Together they find 90% of real bugs.",
    evalHints: ["inputs outputs", "code access", "behavior", "validation", "session", "error message"]
  },
  {
    id: "ft2",
    topic: "Functional Testing",
    difficulty: "medium",
    q: "Explain Equivalence Partitioning and Boundary Value Analysis. Design test cases for a password field that accepts 8–16 characters.",
    key: "EP divides inputs into valid/invalid partitions: valid (8-16 chars), invalid-short (<8), invalid-long (>16). BVA tests at partition boundaries: 7 chars (invalid), 8 chars (valid, lower boundary), 9 chars (valid, just inside), 15 chars (valid, just inside), 16 chars (valid, upper boundary), 17 chars (invalid). Combined gives 7 meaningful test cases covering all logical partitions without exhaustive testing.",
    evalHints: ["valid partition", "invalid partition", "boundary", "7 8 9", "15 16 17", "test cases"]
  },
  {
    id: "ft3",
    topic: "Functional Testing",
    difficulty: "medium",
    q: "What is regression testing and why is it critical in agile sprints? How does Selenium automation support regression cycles?",
    key: "Regression testing re-runs existing test cases after code changes to ensure no previously working functionality broke. In agile, every sprint delivers new features that could break existing flows — manual regression on 500 test cases before each release is infeasible. Selenium automates the regression suite: runs overnight, generates HTML reports, integrates with Jenkins CI/CD pipeline, flags failures with screenshots, and enables the team to release confidently within sprint timelines.",
    evalHints: ["existing functionality", "code changes", "sprint", "overnight", "Jenkins", "CI/CD", "HTML report", "screenshot"]
  },
  {
    id: "ft4",
    topic: "Functional Testing",
    difficulty: "medium",
    q: "Define test case vs test scenario. Write a test scenario and 3 detailed test cases for a 'Forgot Password' feature.",
    key: "Test scenario: high-level user story (Verify user can reset password via email). Test case: step-by-step with preconditions, data, steps, expected result. TC1: Valid registered email → enter registered@test.com → click Submit → expect 'Reset email sent' message and email arrives within 60s. TC2: Unregistered email → enter unknown@test.com → expect inline error 'Email not found'. TC3: Empty field → click Submit without entering email → expect validation 'Email is required'.",
    evalHints: ["preconditions", "expected result", "valid email", "unregistered", "empty field", "validation", "step by step"]
  },
  {
    id: "ft5",
    topic: "Functional Testing",
    difficulty: "hard",
    q: "What is exploratory testing? How does it complement automated Selenium tests in a real project?",
    key: "Exploratory testing is simultaneous learning, test design, and execution — the tester explores the application without predefined scripts, using intuition and experience to find unexpected bugs. It complements Selenium automation because: Selenium covers known happy paths and regression scenarios reliably, while exploratory testing finds edge cases, UI inconsistencies, and UX issues that automation never tests. In a real project: automation runs in CI/CD for stability, exploratory testing runs each sprint on new features before they enter the regression suite.",
    evalHints: ["simultaneous", "without scripts", "intuition", "edge cases", "complement", "CI/CD", "new features"]
  },

  // ── SQL ───────────────────────────────────────────────────────
  {
    id: "sql1",
    topic: "SQL",
    difficulty: "medium",
    q: "What is the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN? Write a SQL query to fetch all employees and their department names, including employees without a department.",
    key: "INNER JOIN: returns only rows with matching values in both tables. LEFT JOIN: all rows from left table + matches from right (NULL for no match). RIGHT JOIN: all rows from right table + matches from left. Query: SELECT e.emp_name, d.dept_name FROM employees e LEFT JOIN departments d ON e.dept_id = d.dept_id; — LEFT JOIN used because employees without department still appear with dept_name as NULL.",
    detailedAnswer: "REAL-WORLD SCENARIO: Your test data setup creates 100 employees, but contractor/interns don't have departments assigned yet. Queries to verify data:\n\nDATABASE STRUCTURE:\nemployees table: (id, name, dept_id)\n- 1, John, 5 (dept_id exists)\n- 2, Jane, 5\n- 3, Alex, NULL (contractor — no department!)\n- 4, Sam, NULL\n\ndepartments table: (id, name)\n- 5, Engineering\n- 6, Sales (nobody assigned)\n\n❌ INNER JOIN (LOSES CONTRACTORS!):\n```\nSELECT e.emp_name, d.dept_name \nFROM employees e \nINNER JOIN departments d ON e.dept_id = d.dept_id;\n```\nResult: 2 rows (John, Jane only!) — Alex and Sam are MISSING\nWhy: INNER JOIN only returns matching pairs. Since Alex/Sam have NULL dept_id, there's no match.\n\n✓ LEFT JOIN (KEEPS CONTRACTORS!):\n```\nSELECT e.emp_name, d.dept_name \nFROM employees e \nLEFT JOIN departments d ON e.dept_id = d.dept_id;\n```\nResult: 4 rows\n- John, Engineering\n- Jane, Engineering\n- Alex, NULL ← contractor appears with no department\n- Sam, NULL ← contractor appears with no department\nWhy: LEFT JOIN returns ALL employees + matched departments. Unmatched rows get NULL.\n\n⚠ RIGHT JOIN (Rarely used, confusing):\n```\nSELECT e.emp_name, d.dept_name \nFROM employees e \nRIGHT JOIN departments d ON e.dept_id = d.dept_id;\n```\nResult: 3 rows\n- John, Engineering\n- Jane, Engineering\n- NULL, Sales ← Sales department with no employee!\nWhy: RIGHT JOIN returns ALL departments + matched employees.\n\n🎯 TEST DATA IMPLICATIONS:\nIf you're setting up test data and forget contractors:\n- INNER JOIN hides the bug (you won't catch missing contractors in tests)\n- LEFT JOIN catches it (NULL values alert you to incomplete data)\n- As a tester, ALWAYS use LEFT JOIN when validating test data setup\n\nKEY INSIGHT: In test frameworks, use LEFT JOIN to verify data completeness. If you get unexpected NULLs, your test data setup is incomplete!",
    evalHints: ["matching rows", "all left", "NULL", "LEFT JOIN", "ON clause", "employees without department"]
  },
  {
    id: "sql2",
    topic: "SQL",
    difficulty: "medium",
    q: "Explain GROUP BY and HAVING with examples. Write a query to find all departments where the average salary exceeds 50000.",
    key: "GROUP BY aggregates rows into groups by column value. HAVING filters those groups (like WHERE but for aggregated results). WHERE filters before grouping, HAVING filters after. Query: SELECT dept_id, AVG(salary) as avg_sal FROM employees GROUP BY dept_id HAVING AVG(salary) > 50000 ORDER BY avg_sal DESC; — HAVING must be used here because WHERE cannot filter on aggregate functions.",
    evalHints: ["aggregate", "HAVING vs WHERE", "AVG", "GROUP BY", "after grouping", "filter groups"]
  },
  {
    id: "sql3",
    topic: "SQL",
    difficulty: "easy",
    q: "What are PRIMARY KEY, FOREIGN KEY, and UNIQUE constraints? Why are they important when setting up test data in automation?",
    key: "PRIMARY KEY: uniquely identifies each row, cannot be NULL, one per table. FOREIGN KEY: references PRIMARY KEY in another table, enforces referential integrity. UNIQUE: no duplicate values allowed, can be NULL, multiple per table. In test automation: violations cause insert failures that are hard to debug — test data scripts must respect PK uniqueness (use sequences/timestamps), FK relationships (insert parent before child), and UNIQUE constraints to avoid flaky data setup failures.",
    evalHints: ["unique identifier", "NULL", "referential integrity", "parent child", "insert order", "test data setup", "flaky"]
  },
  {
    id: "sql4",
    topic: "SQL",
    difficulty: "medium",
    q: "What is the difference between DELETE, TRUNCATE, and DROP? Which command would you use to clean test data after each test run, and why?",
    key: "DELETE: removes specific rows with WHERE clause, fully logged, supports rollback. TRUNCATE: removes all rows, minimal logging, faster, cannot use WHERE, resets identity, supports rollback in some DBs. DROP: removes entire table structure and data permanently. For test cleanup: use DELETE with WHERE test_run_id = @runId to remove only the current run's data (safe, targeted). Use TRUNCATE to reset entire tables between full test suite runs. Never use DROP in automation — it destroys the schema.",
    evalHints: ["WHERE clause", "rollback", "faster", "identity reset", "schema", "test_run_id", "targeted"]
  },
  {
    id: "sql5",
    topic: "SQL",
    difficulty: "hard",
    q: "What is a SQL subquery vs a JOIN? Write a query to find all employees who earn more than the average salary of their department.",
    key: "Subquery: a query nested inside another query, executed first, result used by outer query. JOIN: combines rows from multiple tables based on related columns — generally more performant than correlated subqueries. Query using correlated subquery: SELECT e.emp_name, e.salary, e.dept_id FROM employees e WHERE e.salary > (SELECT AVG(salary) FROM employees WHERE dept_id = e.dept_id); — correlated because inner query references outer query's e.dept_id, runs once per outer row.",
    evalHints: ["nested", "correlated", "AVG", "dept_id", "inner query", "outer query", "performance"]
  },

  // ── SELENIUM ──────────────────────────────────────────────────
  {
    id: "sel1",
    topic: "Selenium",
    difficulty: "easy",
    q: "Explain the different types of locators in Selenium WebDriver. Rank them by reliability and performance, and explain when to use XPath over CSS Selector.",
    key: "Reliability ranking: ID (best — unique, fast), Name, CSS Selector (fast, readable), XPath (powerful but slower), Class, LinkText/PartialLinkText (fragile). CSS Selector preferred for: performance, readability, child/sibling traversal. Use XPath when: element has no ID/class, need to locate by text content (//button[text()='Submit']), need to traverse to parent (//input/../label), or when CSS cannot express the path. Avoid absolute XPath (//html/body/div[1]) — breaks on any DOM change.",
    detailedAnswer: "REAL-WORLD SCENARIO: You're automating tests for an e-commerce site. The developer changes the HTML structure and your tests break.\n\nLOCATOR RELIABILITY (Test in This Order):\n1. ID — BEST (almost never changes)\n   `driver.findElement(By.id('login-btn')).click();` ✓ Safe\n\n2. Name — Good (stable, used in forms)\n   `driver.findElement(By.name('email')).sendKeys('test@test.com');` ✓ Good\n\n3. CSS Selector — RECOMMENDED for automation\n   `driver.findElement(By.cssSelector('.product-card > button.add-to-cart')).click();` ✓ Fast & readable\n   CSS is faster than XPath in Firefox/Edge/Safari\n\n4. XPath — Powerful but fragile\n   `driver.findElement(By.xpath(\"//button[@class='add-to-cart']\")).click();` ⚠ Use cautiously\n\nWHEN CSS FAILS, USE XPATH:\n✗ Problem: Button has no ID/class, only text 'Submit'\n✓ Solution: `//button[text()='Submit']` — XPath has text() function\n\n✗ Problem: Need to find a label's input field (traversing UP the DOM)\n✓ Solution: `//label[text()='Email']/../input` — XPath has parent (..) \nCSS cannot traverse upward!\n\n✗ Problem: Complex conditional search\n✓ Solution: `//tr[td[1]='John'][td[3]='Active']` — find row where col1=John AND col3=Active\n\nAVOID (Breaks on Any HTML Change):\n❌ `//html/body/div[1]/div[2]/button[3]` — Absolute XPath\nBetter: `//div[@class='header']//button[contains(text(),'Login')]` — Relative XPath\n\nPERFORMANCE: CSS Selector > Relative XPath > Absolute XPath\nRELIABILITY: ID > Name > CSS > XPath with text/conditions\n\nBEST PRACTICE: Use ID > Name > CSS in that order. Resort to XPath ONLY when the others fail.",
    evalHints: ["ID fastest", "CSS selector", "XPath text()", "parent traversal", "absolute XPath", "DOM change"]
  },
  {
    id: "sel2",
    topic: "Selenium",
    difficulty: "medium",
    q: "What is the Page Object Model (POM)? Describe the full class hierarchy for a login → dashboard → report page scenario with BasePage.",
    key: "POM is a design pattern where each web page has a corresponding class containing locators and action methods — separating test logic from UI interaction. Hierarchy: BasePage (WebDriver driver, constructor, waitForElement(), takeScreenshot(), getTitle()) → LoginPage extends BasePage (By username, By password, By loginBtn, login(String u, String p) returns DashboardPage) → DashboardPage extends BasePage (By reportsMenu, navigateToReports() returns ReportPage) → ReportPage extends BasePage (By dateFilter, generateReport()). Tests instantiate LoginPage and chain page returns.",
    evalHints: ["BasePage", "extends", "returns page object", "locators as fields", "action methods", "chain", "constructor WebDriver"]
  },
  {
    id: "sel3",
    topic: "Selenium",
    difficulty: "hard",
    q: "Explain implicit wait, explicit wait, and Fluent wait. What are the pitfalls of mixing implicit and explicit waits?",
    key: "Implicit wait: global driver setting, waits up to N seconds for every findElement call (driver.manage().timeouts().implicitlyWait(10, SECONDS)). Explicit wait: waits for a specific condition on a specific element (new WebDriverWait(driver,10).until(ExpectedConditions.elementToBeClickable(btn))). Fluent wait: explicit wait with custom polling interval and exception ignoring. PITFALL: mixing implicit + explicit causes unpredictable wait times — if implicit=10s and explicit=5s, WebDriver may wait up to 15s before failing. Best practice: set implicit to 0, use only explicit waits throughout the framework.",
    evalHints: ["implicit 0", "ExpectedConditions", "polling interval", "mixing pitfall", "15 seconds", "Fluent pollingEvery", "ignoring"]
  },
  {
    id: "sel4",
    topic: "Selenium",
    difficulty: "medium",
    q: "What is TestNG? Explain @BeforeClass, @BeforeMethod, @Test, @AfterMethod, @DataProvider with a real test suite example.",
    key: "TestNG is a testing framework with annotations for setup/teardown, grouping, parallel execution, and data-driven testing. @BeforeClass: runs once before all tests in class — use for browser launch, driver init. @BeforeMethod: runs before each @Test — use for navigating to base URL, clearing cookies. @Test: marks test method, has priority, groups, dependsOnMethods. @AfterMethod: runs after each @Test — use for screenshot on failure, logout. @DataProvider(name='loginData') returns Object[][] — @Test(dataProvider='loginData') runs the test for each row. Example: login test runs 3 times with admin/user/invalid credentials.",
    evalHints: ["@BeforeClass browser", "@BeforeMethod URL", "@AfterMethod screenshot", "Object[][]", "dataProvider", "parallel", "groups"]
  },
  {
    id: "sel5",
    topic: "Selenium",
    difficulty: "hard",
    q: "How do you handle frames, multiple windows, and alerts in Selenium? Give a real-world example for each.",
    key: "Frames: driver.switchTo().frame('frameName') or by index/WebElement — e.g. switching to payment iframe before entering card details. Must switchTo().defaultContent() after. Multiple windows: String mainHandle = driver.getWindowHandle(); for new popup, get all handles, iterate to find the new one, switchTo().window(newHandle) — e.g. handling a print preview popup. Alerts: driver.switchTo().alert().accept() for OK, dismiss() for Cancel, getText() to read message, sendKeys() for prompt — e.g. confirming a delete action alert.",
    evalHints: ["switchTo frame", "defaultContent", "getWindowHandle", "getWindowHandles", "alert accept", "dismiss", "iframe payment"]
  },
  {
    id: "sel6",
    topic: "Selenium",
    difficulty: "medium",
    q: "What is the difference between driver.close() and driver.quit()? Describe a real bug each would cause in a TestNG suite.",
    key: "close() closes only the current browser window/tab but keeps the WebDriver session alive. quit() closes all windows and terminates the WebDriver process entirely. Bug with close(): In @AfterMethod, if test opened a popup window and switched to it, close() only closes the popup — main window stays open, next test's @BeforeMethod finds a stale session with wrong window focus, causing NoSuchWindowException. Bug with quit(): If called in @AfterMethod with @DataProvider running 5 iterations, quit() after iteration 1 destroys the driver — iterations 2-5 throw SessionNotFoundException.",
    evalHints: ["current window", "all windows", "session alive", "NoSuchWindowException", "SessionNotFoundException", "DataProvider iterations", "AfterMethod"]
  }
];

// ─────────────────────────────────────────────────────────────────
// Pick 5 questions — 1 guaranteed per topic, topics shuffled
// Each session gets a different random set within each topic
// ─────────────────────────────────────────────────────────────────
export function pickSessionQuestions() {
  const topics = ["Core Java", "Functional Testing", "SQL", "Selenium"];
  const picked = [];

  topics.forEach(topic => {
    const pool = QUESTION_BANK.filter(q => q.topic === topic);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen) picked.push(chosen);
  });

  // Fill 5th from any topic not already picked
  const usedIds = new Set(picked.map(q => q.id));
  const remaining = QUESTION_BANK.filter(q => !usedIds.has(q.id)).sort(() => Math.random() - 0.5);
  if (remaining.length) picked.push(remaining[0]);

  // Return only question text + id + topic — NO model answers
  return picked.sort(() => Math.random() - 0.5).map(({ id, topic, difficulty, q }) => ({ id, topic, difficulty, q }));
}

// Return full question with key — only used server-side for AI evaluation
export function getFullQuestion(qId) {
  return QUESTION_BANK.find(q => q.id === qId);
}
