# AIQueryHub Full Test Script

**Purpose**: Execute this script start-to-finish to verify all critical features work before launch.

**Time Required**: ~2-3 hours

**Prerequisites**:
- App deployed and accessible
- Supabase project running
- Stripe account in test mode
- A Gmail account (for +alias testing)

---

## PREPARATION

### Step 1: Open Required Tabs

Open these tabs in your browser:

1. **Tab 1**: Your app (production URL)
2. **Tab 2**: Supabase Dashboard → Your Project → Table Editor
3. **Tab 3**: Stripe Dashboard → Test Mode → Payments
4. **Tab 4**: Your Gmail inbox
5. **Tab 5**: This test script

### Step 2: Prepare Test Data

Create a folder on your desktop called `AIQueryHub-Test` with these files:

**File 1: `test-document.txt`**
```
Project Alpha Meeting Notes - December 2024

Attendees: John, Sarah, Mike

Key Decisions:
1. Launch date set for January 15th
2. Budget approved: $50,000
3. Mike will lead the marketing campaign

Action Items:
- John: Finalize product specs by Dec 20
- Sarah: Prepare investor presentation
- Mike: Create social media calendar

Next meeting: December 18th at 2pm
```

**File 2: `test-document-2.md`**
```
# Product Roadmap Q1 2025

## January
- Launch MVP
- Onboard first 10 customers
- Collect feedback

## February
- Implement top 3 requested features
- Start content marketing
- Reach 50 users

## March
- Launch premium tier
- Partnership outreach
- Target: 100 paying customers
```

### Step 3: Note Your Test Email

Your test email will be: `[YOUR_EMAIL]+aiqtest@gmail.com`

Example: `john.doe+aiqtest@gmail.com`

Write it here: `________________________@gmail.com`

---

## PART 1: FRESH USER ONBOARDING

### Test 1.1: Access Landing Page

**Steps**:
1. Open a NEW incognito/private browser window
2. Go to your app URL
3. You should see the landing page (not dashboard)

**Expected**: Landing page loads with pricing, features, CTA buttons

- [ ] PASS / FAIL

**If FAIL, note issue**: _________________________________

---

### Test 1.2: Sign Up Flow

**Steps**:
1. Click "Get Started" or "Sign Up" button
2. Enter your test email: `[YOUR_EMAIL]+aiqtest@gmail.com`
3. Enter password: `TestPassword123!`
4. Click Sign Up button
5. Check your Gmail inbox (regular inbox, not +alias)

**Expected**:
- Sign up form submits without error
- Confirmation email arrives within 2 minutes
- Email contains verification link

- [ ] Form submitted successfully
- [ ] Confirmation email received
- [ ] Email contains clickable link

**If FAIL, note issue**: _________________________________

---

### Test 1.3: Email Verification

**Steps**:
1. Open the confirmation email
2. Click the verification link
3. Should redirect to the app

**Expected**:
- Link opens in browser
- Redirects to app (logged in state)
- No error messages

- [ ] PASS / FAIL

**If FAIL, note issue**: _________________________________

---

### Test 1.4: First Login Experience

**Steps**:
1. After verification, observe the screen
2. Note what you see (dashboard, tutorial, welcome message?)
3. Can you immediately understand what to do?

**Expected**:
- Clear indication of next steps
- Dashboard or onboarding flow visible
- No confusing blank states

- [ ] PASS / FAIL

**Notes on first impression**: _________________________________

---

### Test 1.5: Logout

**Steps**:
1. Find the logout button (usually in settings or profile menu)
2. Click logout
3. Verify you're logged out

**Expected**:
- Logout button is findable
- Redirects to login/landing page
- Can't access dashboard without logging in

- [ ] PASS / FAIL

---

### Test 1.6: Login with New Account

**Steps**:
1. Click "Login"
2. Enter test email: `[YOUR_EMAIL]+aiqtest@gmail.com`
3. Enter password: `TestPassword123!`
4. Click Login

**Expected**:
- Login succeeds
- Dashboard loads
- Session persists (refresh page, still logged in)

- [ ] Login works
- [ ] Dashboard loads
- [ ] Session persists after refresh

---

## PART 2: DOCUMENT MANAGEMENT

### Test 2.1: Upload First Document

**Steps**:
1. Navigate to Documents page
2. Click "Upload" or drag-drop area
3. Select `test-document.txt` from your test folder
4. Wait for upload

**Expected**:
- Upload progress indicator shows
- Document appears in list
- No error messages

- [ ] PASS / FAIL

**If FAIL, note issue**: _________________________________

---

### Test 2.2: Upload Second Document

**Steps**:
1. Upload `test-document-2.md`
2. Wait for completion

**Expected**:
- Second document appears
- Document count shows "2"

- [ ] PASS / FAIL

---

### Test 2.3: View Document

**Steps**:
1. Click on `test-document.txt` in the list
2. Document viewer/modal should open
3. Verify content is readable

**Expected**:
- Modal/viewer opens
- Full text content visible
- Can close modal

- [ ] PASS / FAIL

---

### Test 2.4: Search Documents

**Steps**:
1. Find search box on documents page
2. Type "Project Alpha"
3. Press Enter or wait for search

**Expected**:
- `test-document.txt` appears in results
- `test-document-2.md` does NOT appear (doesn't contain "Project Alpha")

- [ ] PASS / FAIL

---

### Test 2.5: Generate AI Summary

**Steps**:
1. Find the document `test-document.txt`
2. Look for "Generate Summary" or AI insights button
3. Click it
4. Wait for AI processing

**Expected**:
- Loading indicator shows
- Summary/insights appear
- Summary is relevant to document content

- [ ] PASS / FAIL

**AI Summary quality (1-5)**: ___

---

### Test 2.6: Delete Document

**Steps**:
1. Find delete button for `test-document-2.md`
2. Click delete
3. Confirm deletion if prompted

**Expected**:
- Confirmation dialog appears
- Document removed from list
- Document count decreases

- [ ] PASS / FAIL

---

## PART 3: AI QUERY SYSTEM

### Test 3.1: Ask Basic Question

**Steps**:
1. Find the AI query input (dashboard or dedicated page)
2. Type: "What was the budget for Project Alpha?"
3. Press Enter/Submit

**Expected**:
- Loading indicator shows
- AI responds with "$50,000"
- Response references the source document

- [ ] Got correct answer ($50,000)
- [ ] Source document referenced

---

### Test 3.2: Ask Follow-up Question

**Steps**:
1. In same input, type: "Who is leading the marketing campaign?"
2. Submit

**Expected**:
- AI responds with "Mike"
- Context maintained from previous query

- [ ] PASS / FAIL

---

### Test 3.3: Ask Question with No Answer

**Steps**:
1. Type: "What is the company's revenue?"
2. Submit

**Expected**:
- AI indicates information not found in documents
- Does NOT hallucinate a fake answer

- [ ] PASS / FAIL

---

### Test 3.4: Copy Response

**Steps**:
1. Find copy button on AI response
2. Click it
3. Paste somewhere to verify

**Expected**:
- Response copied to clipboard
- Paste shows the response text

- [ ] PASS / FAIL

---

## PART 4: KNOWLEDGE BASES

### Test 4.1: Create Knowledge Base

**Steps**:
1. Navigate to Knowledge Bases page
2. Click "Create Knowledge Base"
3. Enter:
   - Title: "Project Alpha KB"
   - Description: "All Project Alpha related documents"
   - Type: General (or appropriate option)
4. Save

**Expected**:
- Form submits
- New KB appears in list
- Success toast/message shows

- [ ] PASS / FAIL

---

### Test 4.2: Add Document to KB

**Steps**:
1. Open "Project Alpha KB"
2. Find option to add documents
3. Add `test-document.txt`
4. Save

**Expected**:
- Document associated with KB
- Document count shows "1"

- [ ] PASS / FAIL

---

### Test 4.3: Query Knowledge Base

**Steps**:
1. Go to AI query
2. Select "Project Alpha KB" as context (if option exists)
3. Ask: "When is the next meeting?"

**Expected**:
- AI answers "December 18th at 2pm"
- Only searches within KB documents

- [ ] PASS / FAIL

---

### Test 4.4: Delete Knowledge Base

**Steps**:
1. Find delete option for "Project Alpha KB"
2. Delete it
3. Confirm if prompted

**Expected**:
- KB removed from list
- Documents NOT deleted (still in Documents page)

- [ ] PASS / FAIL

---

## PART 5: TIMELINE / TASK MANAGEMENT

### Test 5.1: Create Task

**Steps**:
1. Navigate to Timeline page
2. Click "Add Task" or "+" button
3. Enter:
   - Title: "Test Task 1"
   - Duration: 30 minutes
4. Save

**Expected**:
- Task appears on timeline
- Shows correct duration
- Positioned at current time or selected time

- [ ] PASS / FAIL

---

### Test 5.2: Edit Task

**Steps**:
1. Click on "Test Task 1"
2. Change title to "Updated Test Task"
3. Save

**Expected**:
- Task updates immediately
- New title shows
- No duplicate created

- [ ] PASS / FAIL

---

### Test 5.3: Mark Task Complete

**Steps**:
1. Find "Mark as Done" or checkmark on task
2. Click it

**Expected**:
- Task marked as complete
- Visual change (strikethrough, color, moved to done section)
- Toast message confirms

- [ ] PASS / FAIL

---

### Test 5.4: Delete Task

**Steps**:
1. Create another task: "Task to Delete"
2. Find delete option
3. Delete it

**Expected**:
- Task removed
- Confirmation if destructive action

- [ ] PASS / FAIL

---

### Test 5.5: Drag and Drop (if applicable)

**Steps**:
1. Create two tasks: "Task A" and "Task B"
2. Try to drag "Task B" above "Task A"

**Expected**:
- Drag works smoothly
- Order changes
- Order persists after refresh

- [ ] PASS / FAIL

---

## PART 6: DAILY PLANNING

### Test 6.1: Open Daily Planning

**Steps**:
1. Find "Daily Planning" or "Plan Day" button
2. Click to open

**Expected**:
- Planning modal/flow opens
- Clear first step visible

- [ ] PASS / FAIL

---

### Test 6.2: Complete Planning Flow

**Steps**:
1. Progress through each step of planning
2. Add at least one task if prompted
3. Complete all steps

**Expected**:
- Can progress through all steps
- Completion celebration (confetti or message)
- Tasks added to timeline

- [ ] PASS / FAIL

---

## PART 7: SETTINGS

### Test 7.1: Update Profile

**Steps**:
1. Go to Settings
2. Find profile section
3. Update name to "Test User"
4. Save

**Expected**:
- Changes save successfully
- Name updates in UI (header, profile)

- [ ] PASS / FAIL

---

### Test 7.2: Change Theme

**Steps**:
1. Find theme toggle (light/dark)
2. Switch to opposite theme
3. Refresh page

**Expected**:
- Theme changes immediately
- Theme persists after refresh

- [ ] PASS / FAIL

---

## PART 8: PAYMENT FLOW

### Test 8.1: View Pricing

**Steps**:
1. Find Pricing or Billing page
2. Review available plans

**Expected**:
- All plans visible with prices
- Features listed for each tier
- Subscribe/Upgrade buttons visible

- [ ] PASS / FAIL

---

### Test 8.2: Start Checkout

**Steps**:
1. Click "Subscribe" on a paid plan
2. Should redirect to Stripe checkout

**Expected**:
- Stripe checkout page loads
- Correct plan/price shown
- Your app logo/name visible

- [ ] PASS / FAIL

---

### Test 8.3: Complete Payment (Test Card)

**Steps**:
1. On Stripe checkout, enter:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - Name: Test User
   - Postal: 12345
2. Click Pay/Subscribe

**Expected**:
- Payment processes
- Success page/redirect
- Back to your app

- [ ] PASS / FAIL

---

### Test 8.4: Verify Subscription Active

**Steps**:
1. After payment, check billing/settings
2. Verify plan shows as active
3. Check Stripe dashboard (Tab 3) for payment

**Expected**:
- App shows correct subscription tier
- Stripe shows successful payment
- Premium features now accessible

- [ ] App shows correct plan
- [ ] Stripe shows payment
- [ ] Premium features work

---

### Test 8.5: Test Failed Payment

**Steps**:
1. Log out, create NEW test account: `[YOUR_EMAIL]+aiqtest2@gmail.com`
2. Go through signup
3. Try to subscribe with declined card: `4000 0000 0000 0002`

**Expected**:
- Error message shows (card declined)
- Not subscribed
- Can retry with different card

- [ ] PASS / FAIL

---

### Test 8.6: Access Billing Portal

**Steps**:
1. Log back into first test account (`+aiqtest`)
2. Go to Settings → Billing
3. Click "Manage Billing" or similar

**Expected**:
- Stripe billing portal opens
- Can view invoices
- Can update payment method

- [ ] PASS / FAIL

---

## PART 9: INTEGRATIONS

### Test 9.1: Google OAuth Login

**Steps**:
1. Log out
2. Click "Sign in with Google"
3. Complete OAuth flow

**Expected**:
- Google popup/redirect
- Can select account
- Logs in successfully

- [ ] PASS / FAIL

---

### Test 9.2: Google Drive (if configured)

**Steps**:
1. Go to Add Documents → Google Drive
2. Click Connect
3. Authorize access
4. Select a test folder
5. Sync

**Expected**:
- OAuth completes
- Can browse Drive folders
- Sync imports documents

- [ ] PASS / FAIL / NOT CONFIGURED

---

### Test 9.3: Google Calendar (if configured)

**Steps**:
1. Go to Timeline or Settings
2. Find Calendar sync
3. Connect Google Calendar

**Expected**:
- OAuth completes
- Calendar events appear on timeline

- [ ] PASS / FAIL / NOT CONFIGURED

---

## PART 10: ERROR HANDLING

### Test 10.1: Network Error Simulation

**Steps**:
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Set "Throttling" to "Offline"
4. Try to load a page
5. Set back to "Online"

**Expected**:
- Graceful error message when offline
- Recovers when back online

- [ ] PASS / FAIL

---

### Test 10.2: Invalid Input

**Steps**:
1. Try to create a task with empty title
2. Try to create KB with empty title

**Expected**:
- Validation error shown
- Form doesn't submit
- Clear message what's wrong

- [ ] PASS / FAIL

---

### Test 10.3: Session Expiry

**Steps**:
1. In Supabase dashboard (Tab 2)
2. Go to Authentication → Users
3. Find your test user
4. Delete user OR wait for session timeout

**Expected**:
- App handles gracefully
- Redirects to login
- No stuck states

- [ ] PASS / FAIL

---

## PART 11: CLEANUP

### Test 11.1: Delete Test Accounts

**Steps**:
1. Go to Supabase → Authentication → Users
2. Find test accounts (`+aiqtest`, `+aiqtest2`)
3. Delete them

**Expected**:
- Users deleted
- Associated data cleaned up

- [ ] Done

---

### Test 11.2: Cancel Test Subscriptions

**Steps**:
1. Go to Stripe Dashboard (Tab 3)
2. Find test subscriptions
3. Cancel them

**Expected**:
- Subscriptions cancelled
- No ongoing test charges

- [ ] Done

---

## TEST RESULTS SUMMARY

**Date Tested**: ____________________

**Tester**: ____________________

### Pass/Fail Counts

| Section | Passed | Failed | Notes |
|---------|--------|--------|-------|
| Part 1: Onboarding | /6 | | |
| Part 2: Documents | /6 | | |
| Part 3: AI Query | /4 | | |
| Part 4: Knowledge Bases | /4 | | |
| Part 5: Timeline | /5 | | |
| Part 6: Daily Planning | /2 | | |
| Part 7: Settings | /2 | | |
| Part 8: Payments | /6 | | |
| Part 9: Integrations | /3 | | |
| Part 10: Error Handling | /3 | | |
| **TOTAL** | **/41** | | |

### Critical Issues Found

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Minor Issues Found

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Overall Assessment

- [ ] READY FOR LAUNCH
- [ ] NEEDS FIXES (list above)
- [ ] MAJOR ISSUES (do not launch)

---

## NEXT STEPS

If all tests pass:
1. Delete this test data
2. Recruit 2-3 beta testers
3. Have them run through Parts 1-6
4. Collect feedback
5. Fix any issues they find
6. Launch!

If tests fail:
1. Document exact failure steps
2. Fix issues
3. Re-run failed tests
4. Repeat until all pass
