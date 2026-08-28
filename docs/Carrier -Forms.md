Please update the Carrier module to add the missing fields from the carrier data my client provided.

New fields to add

Add these fields to the Add Carrier / Edit Carrier form:

Payment Terms

Example: 50% on pickup, 50% on delivery
Store as a string.

Insured Vehicle VINs

Allow multiple VIN numbers.
Use an array of strings in MongoDB.
Example:
4V4NC9EH2HN983072
3AKJHHDR2PSUG1237
4V4NC9EH4KN898399
1JJV532D0LL169390
3H3V532C3LR187015
5V8VC5327LM003396
5V8VC5329LM003397

The UI should make it easy to add/remove multiple VINs.

Insurance Certificate / Insurance ID

Example: 9300118076
Store as a string because insurance identifiers may contain letters or leading zeros.

Detailed Service Areas / Regions

The existing Service Areas field should support detailed regions and states.
Do not remove or break the existing Service Areas functionality.
Support data such as:
Northeast: ME, VT, NH, MA, RI, CT, NY, PA, NJ
Mid-Atlantic: DE, MD, DC, VA, WV
Southeast: NC, SC, GA, FL, AL, MS, LA, TN, KY

Use an appropriate MongoDB structure, preferably an array/object structure rather than one large unstructured text field if the existing architecture allows it.
IMPORTANT: MongoDB Atlas

Do NOT only change the frontend.

Trace the existing Carrier data flow and make sure these fields are properly implemented throughout the entire application:

Form → frontend state → API/request payload → backend/controller/service → validation → MongoDB model/schema → MongoDB Atlas → API response → Carrier details/edit page

Make sure the new fields are actually persisted in MongoDB Atlas when a carrier is created or updated.

Database requirements
Update the existing Carrier MongoDB schema/model rather than creating a separate collection unless the current architecture specifically requires it.
Use sensible field names and keep naming consistent across frontend/backend/database.
paymentTerms: string
insuredVehicleVINs: array of strings
insuranceCertificateId: string
serviceAreas: use the existing structure if possible, but extend it to support detailed regions/states without breaking existing records.
Existing carrier records must continue to work even if these fields don't exist.
New fields should be optional so existing carriers are not broken.
Existing carrier example

Make sure this client data can be stored correctly:

Carrier: DIMASLOGISTIC INC

Payment Terms: 50% on pickup, 50% on delivery
Insurance Certificate / Insurance ID: 9300118076
Insurance Expires: 03/27/2027
Service Regions:
Northeast: ME, VT, NH, MA, RI, CT, NY, PA, NJ
Mid-Atlantic: DE, MD, DC, VA, WV
Southeast: NC, SC, GA, FL, AL, MS, LA, TN, KY
VINs:
4V4NC9EH2HN983072
3AKJHHDR2PSUG1237
4V4NC9EH4KN898399
1JJV532D0LL169390
3H3V532C3LR187015
5V8VC5327LM003396
5V8VC5329LM003397
UI requirements

Add the fields in a logical location:

Payment & Operations

Payment Terms
Equipment Types
Service Areas

Insurance

Insurance Carrier
Insurance Certificate / Insurance ID
Insurance Policy #
Insurance Expires
Insured Vehicle VINs

Make the UI clean and consistent with the existing Carrier form.

For VINs, provide an intuitive multi-value input with an Add VIN option and the ability to remove individual VINs.

For Service Areas, allow multiple regions and states to be entered/selected without requiring everything to be stored as one long Notes string.

Carrier details page

Also update the Carrier details/view page so these new fields are displayed.

Do not leave the new information hidden only in Notes.

Edit functionality

Make sure the fields work when editing an existing carrier:

Load existing values from MongoDB Atlas.
Allow the user to modify them.
Save the changes back to MongoDB Atlas.
Refresh/display the updated values correctly.
Validation

Add reasonable validation:

VINs should be validated as VIN-like 17-character values where appropriate.
Prevent accidental duplicate VINs within the same carrier.
Trim whitespace from VINs and identifiers.
Do not make these new fields required if existing carriers may not have them.
Backward compatibility

Do not break existing Carrier records, APIs, or existing fields.

Before making changes, inspect the existing Carrier model/schema, API routes, controllers/services, form components, and details page so the implementation follows the project's current architecture and conventions.

After implementing, verify that creating/editing a carrier actually writes the new fields to MongoDB Atlas, and that retrieving the carrier returns them correctly.

Finally, tell me:

Which files you changed.
What MongoDB schema/model changes you made.
What API changes you made.
How the new fields are stored in MongoDB Atlas.
How you verified that create/edit/read all work correctly.
