# Delete Meal Order API

## Endpoint

**DELETE** `/api/admin/plan/order/:id`

## Description

This endpoint allows administrators to delete a user's meal order (PlanOrder), enabling the user to place a new order for that same week without restriction.

## Authentication

Requires admin authentication via `authMiddleware.validateAdmin`.

## Use Case

When a customer wants to change their meal selection after confirming their order, the admin can use this endpoint to:

1. Delete the existing meal order
2. Reset the user's `confirmOrderWeek` to allow reordering
3. Enable the customer to place a new order with different meal choices

## Request

### URL Parameters

| Parameter | Type | Required | Description                       |
| --------- | ---- | -------- | --------------------------------- |
| `id`      | UUID | Yes      | The ID of the PlanOrder to delete |

### Example Request

```bash
DELETE /api/admin/plan/order/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <admin_token>
```

## Response

### Success Response (200 OK)

```json
{
  "status": 200,
  "data": {
    "deletedOrderId": "123e4567-e89b-12d3-a456-426614174000",
    "orderWeek": 8
  },
  "message": "Bestelling succesvol verwijderd. Gebruiker kan nu opnieuw bestellen voor week 8"
}
```

### Error Responses

#### Order Not Found (404)

```json
{
  "status": 404,
  "message": "Bestelling niet gevonden"
}
```

#### Plan Not Found (404)

```json
{
  "status": 404,
  "message": "Plan niet gevonden voor deze bestelling"
}
```

#### Invalid UUID (400)

```json
{
  "status": 400,
  "message": "Invalid UUID format"
}
```

## Implementation Details

### What Happens When an Order is Deleted

The deletion process performs two operations in a database transaction:

1. **Delete the PlanOrder record**

   - Removes the meal order from the database
   - Frees up the order slot for that week

2. **Reset UserPlan.confirmOrderWeek**
   - Sets `confirmOrderWeek` back to the deleted order's week number
   - Allows the user to place a new order for that same week
   - Bypasses the "already placed an order" validation

### Transaction Safety

Both operations are executed in a Prisma transaction, ensuring:

- Either both operations succeed, or both are rolled back
- Data consistency is maintained
- No partial updates can occur

### User Experience After Deletion

After an admin deletes a user's meal order:

1. **User can reorder** - The user can access `/api/user/plan/order/confirm` and place a new order for the same week
2. **No restrictions** - The validation checking for existing orders will pass
3. **Same week** - The user orders for the exact same week as the deleted order
4. **New meal selection** - The user can choose completely different meals

## Workflow Example

### Initial State

```
User Plan:
- confirmOrderWeek: 9 (next week)

Plan Orders:
- Order ID: abc-123
  - week: 8
  - mealsForTheWeek: [breakfast, lunch, dinner...]
  - status: confirmed
```

### After Deletion

```
User Plan:
- confirmOrderWeek: 8 (reset to deleted order's week)

Plan Orders:
- (Order abc-123 deleted)
```

### After User Reorders

```
User Plan:
- confirmOrderWeek: 9 (advanced to next week again)

Plan Orders:
- Order ID: def-456 (NEW)
  - week: 8
  - mealsForTheWeek: [NEW selection]
  - status: confirmed
```

## Admin Workflow

1. Customer contacts support wanting to change their meal selection
2. Admin retrieves the order ID from the admin panel or database
3. Admin calls DELETE `/api/admin/plan/order/:id`
4. Admin confirms deletion was successful
5. Admin notifies customer they can now reorder
6. Customer logs in and places new order with different meals

## Testing

### Test in Development

1. **Create a test order:**

   ```bash
   POST /api/user/plan/order/confirm
   # User confirms meals for current week
   ```

2. **Delete the order:**

   ```bash
   DELETE /api/admin/plan/order/{order-id}
   ```

3. **Verify user can reorder:**
   ```bash
   POST /api/user/plan/order/confirm
   # Should succeed without "already placed an order" error
   ```

### Verification Query

Check the database to confirm the deletion and reset:

```sql
-- Check if order was deleted
SELECT * FROM "PlanOrder" WHERE id = 'deleted-order-id';
-- Should return 0 rows

-- Check if confirmOrderWeek was reset
SELECT "confirmOrderWeek" FROM "UserPlan" WHERE id = 'user-plan-id';
-- Should show the week number of the deleted order
```

## Safety Considerations

### When to Use

✅ **Appropriate uses:**

- Customer wants to change meal selection before lockdown day
- Customer made a mistake in their order
- Special dietary needs changed after ordering
- Customer wants to swap meals

❌ **Inappropriate uses:**

- Order already delivered (status: delivered)
- Past the lockdown day for that week
- After payment has been processed and finalized

### Recommendations

1. **Check order status** before deletion
2. **Verify timing** - Ensure it's before the lockdown day
3. **Communicate with customer** - Confirm they understand the change
4. **Document reason** - Keep notes on why the order was deleted
5. **Monitor Stripe** - Ensure no payment conflicts arise

## Related Endpoints

- **POST** `/api/user/plan/order/confirm` - Create/confirm meal order
- **GET** `/api/admin/plan/order` - List all meal orders
- **GET** `/api/admin/plan/order/:id` - Get specific meal order details
- **PUT** `/api/admin/plan/order/:id` - Update meal order (e.g., change status)

## Notes

- The deletion does not affect Stripe subscriptions
- The user's subscription remains active
- Only the specific meal order for that week is deleted
- The user can immediately place a new order
- No email notifications are sent (consider adding in future)

## Future Improvements

Consider implementing:

- Email notification to user when their order is deleted
- Admin notes/reason field for audit trail
- Automatic refund handling if payment was processed
- Restrictions based on lockdown day (prevent deletion after deadline)
- Webhook to notify frontend in real-time
