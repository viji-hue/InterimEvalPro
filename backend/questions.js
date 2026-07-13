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

  // ── TYPE SCRIPT ──────────────────────────────────────────────
  {
    id: "ts1",
    topic: "TypeScript",
    difficulty: "easy",
    q: "What is TypeScript and why is it useful in Playwright automation projects?",
    key: "TypeScript is a typed superset of JavaScript that compiles to JavaScript. It improves editor support, catches errors earlier, and makes Playwright test code easier to maintain. Benefits include type safety for locators and page objects, better autocomplete, and fewer runtime surprises during test execution.",
    evalHints: ["typed superset", "JavaScript", "type safety", "autocomplete", "Playwright"]
  },

  // ── PLAYWRIGHT OVERVIEW ──────────────────────────────────────
  {
    id: "pw1",
    topic: "Playwright Overview",
    difficulty: "easy",
    q: "What is Playwright and what are its main features for end-to-end testing?",
    key: "Playwright is an open-source automation framework for web browsers that supports Chromium, Firefox, and WebKit. Its main features include cross-browser testing, auto-waiting, built-in locators, assertion support, tracing, screenshots, and test parallelization. It is widely used for reliable end-to-end testing.",
    evalHints: ["cross-browser", "auto-waiting", "locators", "assertions", "trace"]
  },
  {
    id: "pw2",
    topic: "Playwright Overview",
    difficulty: "medium",
    q: "How does Playwright compare with other automation frameworks such as Selenium?",
    key: "Playwright offers a modern API, built-in auto-waiting, strong support for modern web features, easier handling of frames and network events, and a better developer experience with built-in tooling. Selenium is more mature and widely adopted, but Playwright generally provides less boilerplate and more reliable element interaction out of the box.",
    evalHints: ["modern API", "auto-waiting", "frames", "network events", "developer experience", "Selenium"]
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
    id: "sel0",
    topic: "Selenium",
    difficulty: "easy",
    q: "What is Browser Automation? Explain the differences between manual testing and automated testing with Selenium.",
    key: "Browser Automation is using programmatic tools to simulate user actions (click, type, scroll) in a web browser without manual intervention. Manual testing: tester performs actions by hand, slower, prone to human error, non-repeatable. Automated testing with Selenium: scripts perform actions, faster, repeatable, consistent, catches regressions early. Selenium is ideal for regression testing, high-volume test suites, and CI/CD pipelines where tests must run frequently.",
    detailedAnswer: "REAL-WORLD SCENARIO: Acme Corp releases new features every 2 weeks. They have 500 test cases to verify existing functionality doesn't break.\n\nMANUAL TESTING (2005 approach):\n- Tester reads 500 test cases from Excel\n- Manually clicks through each one, taking notes\n- Documents results: PASS/FAIL\n- Time: 5 days (full-time tester)\n- Cost: $500 (salary)\n- Risk: Tester skips boring tests, or makes mistakes on repetitive clicking\n- Result: 1/week regression cycles possible\n\nAUTOMATED TESTING WITH SELENIUM (Today):\n- Engineers write 500 Selenium scripts once\n- Scripts run automatically overnight\n- Generate HTML report with screenshots\n- Time: 2 hours (overnight, unattended)\n- Cost: $0 per run (already paid for automation, upfront investment)\n- Risk: None — tests never skip, never tire\n- Result: 1/day regression cycles possible (release faster!)\n\nWHEN TO AUTOMATE WITH SELENIUM:\n✓ Repetitive test cases (login, form submission, search)\n✓ Regression testing (same tests, every sprint)\n✓ High-volume scenarios (10000 data combinations)\n✓ CI/CD pipelines (run tests on every code commit)\n\nWHEN MANUAL TESTING STILL MATTERS:\n✓ One-off exploratory testing\n✓ UI/UX review (is the button in the right place?)\n✓ Accessibility testing (screen reader compatibility)\n✓ Performance testing (user perception of speed)\n\nKEY INSIGHT: Use BOTH! Automation handles regression at scale, manual testing handles edge cases humans notice.",
    evalHints: ["simulate user actions", "repeatable", "CI/CD", "regressions", "overnight", "cost-effective", "consistency"]
  },
  {
    id: "sel0b",
    topic: "Selenium",
    difficulty: "easy",
    q: "What is Selenium? Provide an overview of Selenium's role in test automation.",
    key: "Selenium is an open-source framework for automating web browsers. It provides APIs to programmatically control Firefox, Chrome, Safari, and Edge browsers across Windows, Mac, and Linux. Selenium enables writing test scripts in Java, Python, C#, JavaScript, Ruby, and others. In test automation, Selenium is used to: simulate user interactions (click, type, scroll), verify web page content and behavior, test across different browsers (cross-browser compatibility), and integrate with CI/CD pipelines for continuous testing. It's industry-standard for functional and regression testing of web applications.",
    evalHints: ["open-source", "web browsers", "cross-browser", "multiple languages", "user interactions", "functional testing", "CI/CD"]
  },
  {
    id: "sel0c",
    topic: "Selenium",
    difficulty: "easy",
    q: "Explain the history and evolution of Selenium. How has Selenium WebDriver changed testing practices?",
    key: "Selenium began as Selenese (JavaScript-based) in 2004, then Selenium RC (Selenium Remote Control) added proxy-based automation. Selenium WebDriver (2008+) introduced native browser drivers, removing proxy complexity and improving performance. Current Selenium 4 (2021+) standardized the WebDriver protocol, added better wait strategies, and improved cross-browser support. Evolution impact: Testing shifted from brittle Selenese scripts to reliable page object models, wait times are now explicit rather than implicit, and WebDriver protocol became a W3C standard that all browsers support.",
    evalHints: ["Selenese", "Selenium RC", "WebDriver", "Selenium 4", "W3C", "page object models", "native drivers"]
  },
  {
    id: "sel0d",
    topic: "Selenium",
    difficulty: "easy",
    q: "Describe the main components of Selenium. How do WebDriver, RemoteWebDriver, and Browser Drivers (ChromeDriver, GeckoDriver) work together?",
    key: "Selenium components: 1) Selenium Core (JavaScript for browser interaction), 2) WebDriver (client library — Java/Python/etc), 3) RemoteWebDriver (client that communicates over HTTP), 4) Browser Drivers (ChromeDriver for Chrome, GeckoDriver for Firefox, etc). Workflow: Test script creates WebDriver instance → sends commands via JSON-RPC → ChromeDriver receives and executes in browser → browser performs action → driver sends response back. RemoteWebDriver allows running tests on remote machines or Selenium Grid for parallel execution.",
    evalHints: ["Selenium Core", "WebDriver", "RemoteWebDriver", "ChromeDriver", "JSON-RPC", "Selenium Grid", "parallel"]
  },
  {
    id: "sel0e",
    topic: "Selenium",
    difficulty: "easy",
    q: "What programming languages are supported by Selenium? Name at least 4 and explain why multi-language support is valuable.",
    key: "Supported languages: Java (most popular, JUnit/TestNG ecosystem), Python (simple syntax, data science integration), C# (.NET integration), JavaScript/Node.js (frontend team familiarity), Ruby (Rails ecosystem). Multi-language support is valuable because: test engineers can use their existing language skill, backend teams can write tests in their native language without learning Java, organizations with polyglot teams don't need to standardize on one language, and it attracts diverse talent to test automation roles.",
    evalHints: ["Java", "Python", "C#", "JavaScript", "Ruby", "language choice", "team expertise", "ecosystem"]
  },
  {
    id: "sel0f",
    topic: "Selenium",
    difficulty: "medium",
    q: "What are the advantages and limitations of using Selenium for test automation? When would you NOT use Selenium?",
    key: "Advantages: open-source (free), supports multiple browsers and OS, multiple languages, large community, integrates with CI/CD. Limitations: only for web applications (not mobile native apps), no built-in reporting (need TestNG/Reports), slow compared to unit tests, flaky tests from timing/synchronization issues, maintenance overhead (tests break on UI changes). Use INSTEAD of Selenium for: mobile native app testing (Appium), desktop applications (WinAppDriver), API testing (REST Assured), performance testing (JMeter), unit testing (JUnit).",
    evalHints: ["open-source", "cross-browser", "web-only", "maintenance", "CI/CD", "no built-in reporting", "flaky", "timing issues"]
  },
  {
    id: "sel0g",
    topic: "Selenium",
    difficulty: "medium",
    q: "Describe the Selenium WebDriver Architecture. How does the JSON-RPC protocol work between client and browser driver?",
    key: "Architecture: Test script (client) → WebDriver (client library) → JSON-RPC over HTTP → Browser Driver (e.g., ChromeDriver) → Browser binary (Chrome, Firefox). JSON-RPC workflow: 1) Script calls driver.findElement(By.id('btn')) → 2) WebDriver serializes to JSON {using: 'id', value: 'btn'} → 3) HTTP POST to http://localhost:4444/session/{sessionId}/element → 4) ChromeDriver parses JSON, finds element in browser DOM → 5) Returns {value: {ELEMENT: '0'}} → 6) WebDriver deserializes and returns WebElement object to script. This standardization (W3C protocol) allows any language to drive any browser.",
    evalHints: ["JSON-RPC", "HTTP", "session", "element reference", "W3C", "serialization", "browser binary"]
  },
  {
    id: "sel0h",
    topic: "Selenium",
    difficulty: "easy",
    q: "What is the setup process for Selenium? Explain the steps to install JDK, Eclipse, and Selenium WebDriver.",
    key: "Setup steps: 1) Download and install JDK (Java 8+) from oracle.com, set JAVA_HOME environment variable. 2) Download Eclipse IDE from eclipse.org, launch and create new Java project. 3) Download Selenium JAR files (or use Maven: add selenium-java dependency in pom.xml). 4) Add JAR files to project classpath (Build Path in Eclipse). 5) Create a test class, import org.openqa.selenium.*, instantiate new ChromeDriver(). 6) Download ChromeDriver matching your Chrome version from chromedriver.chromium.org, add to PATH or specify in code: System.setProperty('webdriver.chrome.driver', '/path/to/chromedriver'). 7) Write first test, run as JUnit test.",
    evalHints: ["JDK", "JAVA_HOME", "Eclipse", "Maven", "JAR", "ChromeDriver", "webdriver.chrome.driver", "PATH"]
  },
  {
    id: "sel0i",
    topic: "Selenium",
    difficulty: "easy",
    q: "Write a 'Hello World' Selenium program. Show the code to launch Chrome, navigate to Google, and close the browser.",
    key: "Code:\n```\nimport org.openqa.selenium.WebDriver;\nimport org.openqa.selenium.chrome.ChromeDriver;\n\npublic class HelloWorld {\n  public static void main(String[] args) {\n    System.setProperty('webdriver.chrome.driver', '/path/to/chromedriver');\n    WebDriver driver = new ChromeDriver();\n    driver.navigate().to('https://www.google.com');\n    System.out.println('Title: ' + driver.getTitle());\n    driver.quit();\n  }\n}\n```\nOutput: Title: Google\nExplanation: System.setProperty() tells WebDriver where ChromeDriver is located. new ChromeDriver() launches Chrome. navigate().to() opens URL. getTitle() fetches page title. quit() closes browser and terminates driver session.",
    evalHints: ["System.setProperty", "ChromeDriver", "navigate", "getTitle", "quit", "main method", "WebDriver interface"]
  },
  {
    id: "sel1",
    topic: "Selenium",
    difficulty: "easy",
    q: "Explain Locating GUI Elements in Selenium. What are locators and why are they critical to writing reliable tests?",
    key: "Locators are strategies to identify HTML elements on a web page. Selenium WebDriver supports 8 locator strategies: ID, Name, ClassName, TagName, CSS Selector, XPath, LinkText, PartialLinkText. Locators are critical because: every action (click, type, verify) requires finding the target element, poor locators break when UI changes, unreliable locators cause flaky tests. Best practice: use ID (most stable), then Name, then CSS Selector, and resort to XPath only when necessary. Avoid using element position or complex absolute paths.",
    evalHints: ["By.id", "By.name", "By.className", "By.xpath", "By.cssSelector", "element identification", "stable locator", "flaky test"]
  },
  {
    id: "sel1a",
    topic: "Selenium",
    difficulty: "easy",
    q: "Describe how to find elements by ID, Name, LinkText, and PartialLinkText. Provide examples for each.",
    key: "1) By ID: By.id('login-btn') — finds <button id='login-btn'>. 2) By Name: By.name('email') — finds <input name='email'>. 3) By LinkText: By.linkText('Sign Up') — finds <a>Sign Up</a> (exact match only). 4) By PartialLinkText: By.partialLinkText('Sign') — finds <a>Sign Up</a> or <a>Signing In</a> (partial match). Examples:\n```\ndriver.findElement(By.id('submit')).click();\ndriver.findElement(By.name('password')).sendKeys('pass123');\ndriver.findElement(By.linkText('Forgot Password')).click();\ndriver.findElement(By.partialLinkText('Contact')).click(); // finds 'Contact Us'\n```\nID and Name are reliable for forms. LinkText/PartialLinkText are useful for navigation links but fragile if link text changes.",
    evalHints: ["By.id", "By.name", "By.linkText", "By.partialLinkText", "form elements", "navigation links", "exact match", "partial match"]
  },
  {
    id: "sel1b",
    topic: "Selenium",
    difficulty: "easy",
    q: "Describe how to find elements by ClassName and CSS Selector. Provide examples including Tag, ID, Class, and Attribute selectors.",
    key: "1) By ClassName: By.className('error-message') — finds <div class='error-message'>. (single class only, space splits classes). 2) CSS Selector: By.cssSelector() — flexible syntax:\n- Tag only: 'button' → all buttons\n- ID: '#login-btn' → element with id='login-btn'\n- Class: '.error-message' → elements with class\n- Attribute: 'input[type=\"password\"]' → input with type attribute\n- Combination: 'form#signup input[name=\"email\"]' → email input in signup form\n- Child: 'div > button' → button direct child of div\n- Descendant: 'div button' → button anywhere inside div\n- nth-child: 'tr td:nth-child(2)' → second column of table\nExamples:\n```\ndriver.findElement(By.className('active')).click();\ndriver.findElement(By.cssSelector('button.submit')).click();\ndriver.findElement(By.cssSelector('input[placeholder=\"Email\"]')).sendKeys('test@test.com');\ndriver.findElement(By.cssSelector('form > button:last-child')).click();\n```\nCSS Selector is preferred for performance and readability.",
    evalHints: ["By.className", "By.cssSelector", "# ID", ". class", "[attribute]", "child combinator >", "descendant", "nth-child"]
  },
  {
    id: "sel1c",
    topic: "Selenium",
    difficulty: "medium",
    q: "What is Shadow DOM and how do you handle it in Selenium? Provide an example.",
    key: "Shadow DOM is an encapsulated DOM tree within a web component, hidden from regular locators. Standard XPath/CSS selectors don't penetrate Shadow DOM. In JavaScript, document.querySelector('#host').shadowRoot.querySelector('#shadow-element') accesses Shadow DOM. Selenium solutions: 1) Use JavaScript execution: driver.executeScript(\"return document.querySelector('#host').shadowRoot.querySelector('#shadow-element')\") → cast result to WebElement. 2) Expand Shadow DOM (if component's expand button exists, click it to show elements in regular DOM). 3) Use WebComponentLocator library. Example:\n```\nWebElement shadowElement = (WebElement) driver.executeScript(\n  \"return document.querySelector('custom-element').shadowRoot.querySelector('.button')\"\n);\nshadowElement.click();\n```",
    evalHints: ["encapsulated", "shadowRoot", "executeScript", "WebComponent", "penetrate", "expand", "JavaScript", "WebElementFromJS"]
  },
  {
    id: "sel1d",
    topic: "Selenium",
    difficulty: "medium",
    q: "What are Relative Locators? Explain above, below, near, toLeft, and toRight. Provide real-world examples.",
    key: "Relative Locators (Selenium 4+) locate elements based on proximity to another element. Syntax: driver.findElement(RelativeLocator.with(By.tagName('button')).above(By.xpath(\"//input[@id='password']\"))). Strategies:\n1) above(): finds element above the reference → locate label above input\n2) below(): finds element below the reference → locate error text below input\n3) near(): finds element near the reference (within 50 pixels) → locate icon near button\n4) toLeftOf(): finds element to the left → locate checkbox label to left of checkbox\n5) toRightOf(): finds element to the right → locate validation message to right of input\nExamples:\n```\nWebElement submitBtn = driver.findElement(RelativeLocator.with(By.tagName('button')).toRightOf(By.id('cancel-btn')));\nWebElement passwordLabel = driver.findElement(RelativeLocator.with(By.tagName('label')).above(By.name('password')));\nWebElement errorMsg = driver.findElement(RelativeLocator.with(By.className('error')).below(By.id('email')));\n```",
    evalHints: ["above", "below", "near", "toLeftOf", "toRightOf", "RelativeLocator", "proximity", "Selenium 4"]
  },
  {
    id: "sel1e",
    topic: "Selenium",
    difficulty: "medium",
    q: "What are Chained Locators? How do you use parent-child relationships to locate elements?",
    key: "Chained Locators combine multiple locators to find nested elements. Syntax: driver.findElement(By.cssSelector('selector1 > selector2 > selector3')) or using WebElement chains: WebElement parent = driver.findElement(By.id('container')); WebElement child = parent.findElement(By.className('item')); Examples:\n```\n// Find submit button inside a specific form\ndriver.findElement(By.cssSelector('form#login-form button[type=\"submit\"]'));\n\n// Find table cell in a specific row\nWebElement row = driver.findElement(By.xpath(\"//tr[td[1]='John']\"));\nWebElement cell = row.findElement(By.xpath(\"./td[2]\")); // relative XPath\n\n// Find input field inside a specific div\nWebElement container = driver.findElement(By.id('form-container'));\nWebElement email = container.findElement(By.name('email'));\n```\nChained locators are more reliable than long absolute paths because they narrow the search scope to a specific context.",
    evalHints: ["parent-child", "container", "relative path", "./", "nested", "scope", "WebElement.findElement"]
  },
  {
    id: "sel1f",
    topic: "Selenium",
    difficulty: "medium",
    q: "Explain XPath syntax. What is the difference between single slash (/) and double slash (//)? Provide examples.",
    key: "XPath uses path expressions to navigate XML/HTML: 1) Single slash (/) — ABSOLUTE path, starts from root. Example: /html/body/div[1]/button — starts from <html>, navigates down exact path. FRAGILE: breaks if any intermediate element changes. 2) Double slash (//) — RELATIVE path, searches anywhere in document. Example: //button[@id='submit'] — finds ANY button with id='submit' regardless of parent elements. PREFERRED. Examples:\n```\n// Absolute (fragile)\n/html/body/div[1]/form/input[1]\n\n// Relative (recommended)\n//input[@type='email']\n//button[text()='Submit']\n//tr/td[1] // first td in any tr\n\n// Mixed\n//form[@id='login']//input[@name='email'] // input anywhere inside login form\n```\nBest practice: Always use // (relative) with specific attributes or text() functions.",
    evalHints: ["absolute path", "relative path", "from root", "anywhere", "fragile", "/", "//", "@attribute"]
  },
  {
    id: "sel1g",
    topic: "Selenium",
    difficulty: "medium",
    q: "Explain XPath functions: contains(), starts-with(), text(), and last(). Provide examples.",
    key: "1) text() — matches element text content. Example: //button[text()='Click Me'] finds button with exact text. 2) contains() — partial text/attribute match. Example: //button[contains(text(),'Click')] finds button containing 'Click'. 3) starts-with() — text/attribute starts with value. Example: //input[starts-with(@id,'email')] finds input with id starting with 'email' (email1, email2, etc). 4) last() — selects last element in list. Example: //tr[last()] finds last table row. Examples:\n```\n//button[contains(text(),'Submit')] // button text contains 'Submit'\n//input[contains(@class,'form-')] // input class contains 'form-'\n//input[starts-with(@name,'txt')] // input name starts with 'txt'\n//td[contains(text(),'John')] and //span[starts-with(@id,'alert')]\n//tr[last()]//td // last column of last row\n//table//tr[position()>1 and position()<5] // rows 2-4\n```",
    evalHints: ["text()", "contains()", "starts-with()", "last()", "@attribute", "position()", "partial match", "function"]
  },
  {
    id: "sel1h",
    topic: "Selenium",
    difficulty: "easy",
    q: "Describe the process of launching different browsers in Selenium. How do you configure ChromeDriver, FirefoxDriver, and SafariDriver?",
    key: "WebDriver initialization for different browsers:\n1) Chrome: System.setProperty('webdriver.chrome.driver', '/path/chromedriver'); WebDriver driver = new ChromeDriver();\n2) Firefox: System.setProperty('webdriver.gecko.driver', '/path/geckodriver'); WebDriver driver = new FirefoxDriver();\n3) Safari: WebDriver driver = new SafariDriver(); (no setProperty needed, driver path auto-detected)\n4) Edge: System.setProperty('webdriver.edge.driver', '/path/msedgedriver'); WebDriver driver = new EdgeDriver();\n5) Browser options for customization:\n```\nChromeOptions options = new ChromeOptions();\noptions.addArguments('--headless'); // run without UI\noptions.addArguments('--disable-notifications');\nWebDriver driver = new ChromeDriver(options);\n```\nBest practice: Use WebDriverManager library (io.github.bonigarcia:webdrivermanager) to auto-download and manage driver versions.",
    evalHints: ["System.setProperty", "ChromeDriver", "FirefoxDriver", "SafariDriver", "EdgeDriver", "options", "headless", "WebDriverManager"]
  },
  {
    id: "sel2",
    topic: "Selenium",
    difficulty: "medium",
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
    id: "sel3a",
    topic: "Selenium",
    difficulty: "medium",
    q: "What is the difference between getWindowHandle() and getWindowHandles() in Selenium?",
    key: "getWindowHandle() returns the unique handle of the current browser window as a String, while getWindowHandles() returns a set of handles for all open browser windows/tabs. Use getWindowHandle() when you want to identify the current window, and getWindowHandles() when you need to switch between multiple windows opened during a test.",
    evalHints: ["current window", "all windows", "String", "Set<String>", "switchTo window"]
  },
  {
    id: "sel3b",
    topic: "Selenium",
    difficulty: "medium",
    q: "How do you switch to a new browser window in Selenium after clicking a link or button?",
    key: "First capture the current window handle, perform the action that opens the new window, then collect all handles using getWindowHandles(), iterate through them, and switch to the one that is not the original handle. After finishing the work, switch back to the parent window if required.",
    evalHints: ["parent handle", "new tab", "window handles", "switchTo", "for each"]
  },
  {
    id: "sel3c",
    topic: "Selenium",
    difficulty: "medium",
    q: "How do you handle frames or iframes in Selenium?",
    key: "Use driver.switchTo().frame() to move into an iframe by index, name, ID, or WebElement. After interacting with the elements inside the frame, switch back using driver.switchTo().defaultContent() or switchTo().parentFrame() to continue working with the main page.",
    evalHints: ["switchTo frame", "iframe", "defaultContent", "parentFrame", "WebElement"]
  },
  {
    id: "sel3d",
    topic: "Selenium",
    difficulty: "medium",
    q: "What are the different types of waits in Selenium and when would you use each?",
    key: "Implicit wait applies globally to all element searches, explicit wait waits for a specific condition on a particular element, and fluent wait allows you to customize polling interval and ignored exceptions. In a robust framework, explicit or fluent waits are preferred over implicit wait to avoid flaky and slow tests.",
    evalHints: ["implicit", "explicit", "fluent", "ExpectedConditions", "polling interval"]
  },
  {
    id: "sel3e",
    topic: "Selenium",
    difficulty: "easy",
    q: "What is the difference between findElement() and findElements() in Selenium?",
    key: "findElement() returns the first matching WebElement and throws NoSuchElementException if nothing is found, while findElements() returns a list of matching elements and returns an empty list when no match exists. Use findElement() for single expected elements and findElements() when you expect multiple results such as rows or links.",
    evalHints: ["single element", "multiple elements", "NoSuchElementException", "List<WebElement>", "empty list"]
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
  },

  // ── SPRING BOOT ────────────────────────────────────────────────
  {
    id: "sb1",
    topic: "Spring Boot",
    difficulty: "medium",
    q: "What is Spring Boot auto-configuration and why is it useful in building a REST service? Give one practical example.",
    key: "Spring Boot auto-configuration uses starter dependencies and conditional annotations to automatically configure beans based on the application classpath and properties. It reduces boilerplate, makes startup faster, and keeps services consistent across environments. Example: adding spring-boot-starter-web auto-configures DispatcherServlet, Jackson, and an embedded Tomcat server, so you can expose REST endpoints without manually wiring those components.",
    evalHints: ["auto-configuration", "starter dependencies", "DispatcherServlet", "embedded Tomcat", "boilerplate", "classpath"]
  },

  // ── REST API ───────────────────────────────────────────────────
  {
    id: "ra1",
    topic: "REST API",
    difficulty: "medium",
    q: "Explain the difference between REST and SOAP, and describe how you would design a POST /employees endpoint for a new service.",
    key: "REST is HTTP-based, stateless, and resource-oriented, while SOAP uses XML envelopes and stricter contracts. A POST /employees endpoint should accept a JSON payload, validate the request, create the employee, and return 201 Created with a Location header and the created resource JSON. For invalid input, return 400 Bad Request; for duplicates, return 409 Conflict if that rule is enforced.",
    evalHints: ["stateless", "HTTP", "POST /employees", "201 Created", "Location header", "400 Bad Request", "409 Conflict", "resource-oriented"]
  },

  // ── DATA JPA ───────────────────────────────────────────────────
  {
    id: "dj1",
    topic: "Data JPA",
    difficulty: "medium",
    q: "What is the role of @Entity, @Id, and JpaRepository? How would you use them in a service that stores employee details?",
    key: "@Entity maps a Java class to a database table, @Id marks the primary key, and JpaRepository provides CRUD and query methods for that entity. In a service, define an Employee entity with @Entity and @Id, inject an EmployeeRepository that extends JpaRepository<Employee, Long>, and call save() to persist data, findAll() to read, or custom derived queries for filtering. This removes manual JDBC code and centralizes persistence logic.",
    evalHints: ["@Entity", "@Id", "JpaRepository", "CRUD", "save()", "findAll()", "manual JDBC", "derived queries"]
  },

  // ── ANGULAR ───────────────────────────────────────────────────
  {
    id: "an1",
    topic: "Angular",
    difficulty: "medium",
    q: "What are Angular components, templates, and services? Explain how a service can fetch data from a REST API and pass it to a component.",
    key: "Components contain the business logic and control a view, templates define the UI and bindings, and services encapsulate reusable logic such as API calls. An Angular service uses HttpClient.get('/api/employees') to fetch data, returns an Observable, and a component subscribes to it in ngOnInit to populate the UI. This keeps API logic out of the component and makes the code easier to test and maintain.",
    evalHints: ["component", "template", "service", "HttpClient", "Observable", "ngOnInit", "subscribe", "reusable logic"]
  }
];

// ─────────────────────────────────────────────────────────────────
// Pick 5 questions from the requested mix: 1 TypeScript,
// 2 Playwright Overview, 1 Functional Testing, and 1 SQL.
// ─────────────────────────────────────────────────────────────────
export function pickSessionQuestions() {
  const requiredMix = [
    { topic: "TypeScript", count: 1 },
    { topic: "Playwright Overview", count: 2 },
    { topic: "Functional Testing", count: 1 },
    { topic: "SQL", count: 1 }
  ];

  const picked = requiredMix.flatMap(({ topic, count }) => {
    const pool = QUESTION_BANK.filter(q => q.topic === topic);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  });

  // Return only question text + id + topic — NO model answers
  return picked.map(({ id, topic, difficulty, q }) => ({ id, topic, difficulty, q }));
}

// Return full question with key — only used server-side for AI evaluation
export function getFullQuestion(qId) {
  return QUESTION_BANK.find(q => q.id === qId);
}
