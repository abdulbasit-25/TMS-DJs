# Commission Workflow

The Commissions module tracks money owed to agents for individual loads. Each
commission record is linked to one load and one agent, stores the gross margin
and rate used, calculates the commission amount, and tracks the payout status.

## How the calculation works

The calculation is:

```text
Commission amount = Gross margin amount x Commission rate / 100
```

The amount is rounded to two decimal places when the record is saved. For
example, a gross margin of `$2,500` at `10%` produces a commission of `$250`.

The create and edit forms provide these tier choices:

| Tier          |                  Rate |
| ------------- | --------------------: |
| Standard      |                   10% |
| Senior        |                   12% |
| Top Performer |                   15% |
| Custom        | Enter a rate manually |

Selecting a named tier fills in its rate. The rate field can then be adjusted
before saving. The preview in the form shows the calculation using the current
gross margin and rate.

> Implementation note: `src/lib/commission.ts` also contains a shared tier
> helper with threshold rates of Standard 8%, Bronze 10%, Silver 12%, Gold
> 15%, and Platinum 18%. The current Commissions page submits the tier and rate
> selected in its form, and the API calculates the amount from those submitted
> values. The threshold helper is not currently used by the page create flow.

## Creating a commission

1. Open **Commissions**.
2. Select **Add Commission**.
3. Select the related load.
4. Select the agent who should receive the commission.
5. Enter the load's gross margin.
6. Select a tier or choose **Custom** and enter the rate.
7. Select the payout status, month, and year. A payout date is optional.
8. Review the commission preview and save the record.

The API requires a load, agent, non-negative gross margin, tier, non-negative
rate, valid month, and year 2000 or later. A commission is normally created in
`pending` status.

## Payout lifecycle

Payout status describes where the commission is in the payment process:

| Status     | Meaning                                                  |
| ---------- | -------------------------------------------------------- |
| Pending    | Commission has been created but payment has not started. |
| Processing | Payment is being prepared or sent.                       |
| Paid       | Payment is complete.                                     |

Marking a commission as **Paid** automatically sets today's payout date when a
date has not already been supplied. Changing status sends notifications to the
agent and relevant accounting or admin users. Creating a commission also sends
an agent notification and an accounting notification.

## Editing and deleting

Administrators and accounting users can edit commission details, change the
payout status, and delete commissions. When gross margin or rate changes, the
API recalculates the commission amount before saving.

Agents, trainees, team managers, lead agents, operations managers, and other
authorized portal roles can access commission data subject to their normal data
access scope. Only administrators and accounting users can change records.

## Dashboard and filters

The page summarizes:

- Pending commission amount and count
- Processing commission amount and count
- Paid commission amount and count
- Accrued amount, which includes every commission not marked Paid
- Total commission amount

Records can be filtered by payout status, search text, and accounting period.
Search matches the agent, load reference, commission ID, and tier. Available
period filters are all time, this month, last month, this quarter, and this
year.

## Exports

The filtered results can be exported as CSV or XLSX. Exports include the
commission ID, load, agent, gross margin, tier, rate, commission amount, payout
status, payout date, month, year, and creation date.

## Data recorded

Each commission stores:

- Load and agent references
- Gross margin amount
- Tier and commission percentage
- Calculated commission amount
- Payout status and optional payout date
- Commission month and year
- Creation and last-update timestamps
