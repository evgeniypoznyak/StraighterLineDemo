Update the triage logic so that:
If amountRequested is exactly 1000, the application routes to a new status: "requires_documentation"
If greater than 1000, it remains "manual_review"
If less than 1000, it follows existing behavior
In addition:
Update any relevant TypeScript types to support the new status
Ensure the API response reflects the new status correctly
Add or update a test to cover this new branch