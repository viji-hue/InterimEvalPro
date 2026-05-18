# Consolidated Report Feature Guide

## Overview

The EvalPro system now supports generating a **Consolidated Trainee Evaluation Report** that includes all trainees' performance data in a single comprehensive document.

## Feature Details

### What is a Consolidated Report?

A consolidated report is a single Word (.docx) document that contains:

- **Overall Summary**: 
  - Total number of trainees
  - Total sessions conducted
  - Overall average score across all trainees
  - Overall pass rate (percentage of trainees scoring ≥60%)

- **Individual Trainee Reports**: 
  - For each trainee:
    - Cohort information
    - Number of sessions completed
    - Average score across all sessions
    - Overall status/grade (Excellent/Good/Needs improvement/Re-assessment)
    - Latest session score and approval status
    - Detailed results from the latest session
      - Question topics
      - Individual question scores
      - Trainee answers vs model answers
      - Evaluator feedback

### Where to Access

1. **In the Trainer Dashboard** (Overview tab):
   - Click the **"📄 Save Consolidated Report"** button
   - The system will generate and automatically save the report to the frontend folder
   - Success message will display with the filename

2. **File Location**:
   - Saved as: `Consolidated_Trainee_Report_[TIMESTAMP].docx`
   - Location: `/frontend/` directory
   - Timestamp format: Unix timestamp (milliseconds)

### How to Generate

#### Via Frontend UI:
1. Log in as a trainer
2. Go to the **Overview** tab
3. Click **"📄 Save Consolidated Report"** button
4. Wait for the success notification
5. The file is now saved in the frontend folder

#### Via API Endpoint:
```bash
GET /api/trainer/consolidated-report
Authorization: Bearer [trainer_token]
```

**Response:**
```json
{
  "ok": true,
  "filename": "Consolidated_Trainee_Report_1234567890.docx",
  "path": "/frontend/Consolidated_Trainee_Report_1234567890.docx",
  "message": "Consolidated report generated and saved successfully"
}
```

### Report Contents

Each consolidated report includes:

#### Header Section
- Document title: "COMPREHENSIVE TRAINEE EVALUATION REPORT"
- Generation date

#### Overall Summary Table
| Metric | Value |
|--------|-------|
| Total Trainees | [Count] |
| Total Sessions | [Count] |
| Overall Avg Score | [Percentage] |
| Pass Rate (≥60%) | [Percentage] |

#### Individual Trainee Sections
For each trainee:

**Summary Table:**
| Field | Value |
|-------|-------|
| Cohort | [Cohort Name] |
| Avg Score | [Percentage] |
| Status | [Grade] |
| Latest Score | [Percentage] |
| Approval Status | ✓ APPROVED / ✗ DENIED / ⏳ PENDING |
| Date | [Date] |

**Latest Session Details:**
- Question-by-question breakdown
- Topics covered
- Scores with color coding:
  - 🟢 7-10: Full marks / Good answer
  - 🟡 5-6: Surface answer
  - 🔴 0-4: Mostly wrong / Irrelevant
- Trainee answers
- Evaluator feedback

### Technical Implementation

#### Backend Changes:
1. **New function**: `generateConsolidatedReportDoc(db)`
   - Generates a comprehensive Word document
   - Includes all trainees' data
   - Saves to frontend folder via `/api/trainer/consolidated-report`

2. **New endpoint**: `GET /api/trainer/consolidated-report`
   - Requires trainer authentication
   - Generates the report
   - Saves to: `../frontend/[filename].docx`
   - Returns file metadata

3. **Static file serving**: Added middleware to serve frontend folder files

#### Frontend Changes:
1. **New API method**: `generateConsolidatedReport(token)`
   - Calls the backend endpoint
   - Handles errors gracefully

2. **New UI button**: "📄 Save Consolidated Report"
   - Located in Overview tab
   - Shows loading state while generating
   - Displays success notification with filename

### Usage Examples

#### Example 1: Generate and Save Report
```javascript
// In trainer dashboard
const result = await api.generateConsolidatedReport(token);
// File saved to: frontend/Consolidated_Trainee_Report_[timestamp].docx
console.log(result.filename); // "Consolidated_Trainee_Report_1716042000000.docx"
```

#### Example 2: Access Saved Report
```
Direct file access (if needed):
GET /frontend/Consolidated_Trainee_Report_1716042000000.docx
```

### Report Versioning

Each report is timestamped to avoid overwriting:
- Filename format: `Consolidated_Trainee_Report_[UNIX_TIMESTAMP].docx`
- Multiple reports can coexist in the frontend folder
- Recommended: Archive old reports periodically

### File Size

A typical consolidated report with 10 trainees and 3 sessions each:
- Estimated size: 1-2 MB
- Dependent on: Number of trainees, sessions, and answer lengths
- Format: Microsoft Word (.docx) - Compatible with MS Office, Google Docs, LibreOffice

### Benefits

✅ **Comprehensive**: All trainee data in one document  
✅ **Archivable**: Easy to save and archive for records  
✅ **Shareable**: Can be easily shared with stakeholders  
✅ **Formatted**: Professional document with tables and formatting  
✅ **Timestamped**: Each report is uniquely identified  
✅ **Persistent**: Saved in frontend folder for long-term storage  

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Button shows "⏳ Generating..." indefinitely | Check browser console for errors; refresh page and retry |
| "Failed to generate consolidated report" | Ensure at least one trainee session exists; check server logs |
| Report file not found in frontend folder | Check server permissions for write access to frontend directory |
| Empty trainee sections | Only latest session details are included; ensure sessions are completed |

### Related Features

- **Individual Trainee Reports**: Download reports for specific trainees (`Download All Reports` button)
- **Dashboard Reports**: Export individual trainee dashboards showing all sessions
- **Bulk Download**: Download all individual reports as a ZIP file

---

**Version**: 1.0  
**Last Updated**: May 18, 2026  
**Endpoint**: `/api/trainer/consolidated-report`  
**Authentication**: Trainer token required
