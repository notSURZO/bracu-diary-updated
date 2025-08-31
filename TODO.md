# TODO List for Missed Deadlines and Marks Update Features

## 1. Fix Missed Deadlines Issue
- [x] Remove filter in `/api/get-deadlines/route.ts` that excludes past deadlines
- [ ] Test that missed deadlines now show when due time crosses

## 2. Implement Marks Update Features in `marks-calculation/[courseId]/page.tsx`
- [ ] Add toast import (`import { toast } from 'react-toastify';`)
- [ ] Add toast.success in `handleMarkSubmit` after successful marks update
- [ ] Modify `MarksSection` component to have two sections:
  - "Pending Mark Updates" (deadlines without marks)
  - "Marks Updated" (deadlines with marks)
- [ ] Add logic to filter deadlines based on whether they have marks
- [ ] Add re-update button in "Marks Updated" section that opens the modal
- [ ] Test the toast notification and sections functionality

## 3. Remove Completed Checkbox from Missed Deadlines
- [x] Remove completed checkbox from missed deadlines in manage-deadlines page

## 4. Testing
- [ ] Test missed deadlines display
- [ ] Test marks update toast
- [ ] Test marks updated section and re-update functionality
