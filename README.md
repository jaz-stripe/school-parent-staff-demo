# Click to view demo
This is a simple themed demo for an imaginary school management system showing how such a system could integrate with Stripe Billing (RFA).

* There is a `.env.local` that should be copied to `.env` to include important constants such as Stripe secret key, private key, and webhook secret. It additionally contains a default email address. NOTE: We may need to include a currency code for local display
* The file `PeterRabbitAndFriends.ts` contains default names to prepolulate where required
* Parents, students, staff, products, products purchsed are all stored in a local SQLite database. 
* There is a file `products.csv` which contains a product on each line with product name, product type, amount, and year
    * The product type can be `tuition`, `studentItem`, and `parentItem`
    * The ammount is in cents, i.e at the lowest granularity of a currency. The currency is set at the Stripe account level
* This project includes a script, `populate_database.ts` to read `products.csv` and creates the products in Stripe and updates the local SQLite tables accordingly. It includes a corresponding script, `delete_stripe_products_and_customers.ts` to archive all Stripe products and delete the created users.
* Please refer to `lib/db.ts` for the database schema.

Populate database
Populate database reads products.csv
* For type `tuition` create a product with the name, and metdata `year` as the year. Create a yearly, monthly, and weekly price for the product using the given amount as the annual price and diving accordingly. Add the product to the `subscription` table referencing the stripe ID, and add each product to the `subscription_price` table referencing the subscription and the Stripe price ID, and year, ensuring completing all the details
* The the `studentItem` and `parentItem` types create a stripe product with a one-time price and store the product, type, stripe product ID and Stripe price ID in the `product` table.

I invision the following work flows:
For a parent:
* A parent can log in or sign up from index.html.
* When a parent signs up they see a page which collects their details, in the following order vertically; name, email, address, their childrens names and school year (1-12) as prospective students, with one by default and a + to add other students below the first one. The frequency they would like to pay from a dropdown of (annualy, quarterly, monthly, weely), payent method collection, and submit.
* Stripe Address Element is used for address, and Payment Element is used in setup mode to capture a payment method.
* The parent details are auto populates from PeterRabbitAndFriends list and includes the name, email, and address. These pre-populated values can all be changed before submission.
* Each pupils name is chosen from PeterRabbitAndFriends and is unique when considering the parent name and other sudent names. The student year is randomly chosen from 1-12. The year is a drop down to select 1-12.
* A 'sign up' button is used to submit all these details.
* When the 'sign up' is clicked, the following events occur
    * A new stripe customer is created for the given email address and the resulting Stripe Customer ID and other parent details added to the `parent` table.
    * Each student is added to the `student` table and associated with the parent.
    * The payment method is captured using the Stripe customer ID, with the payment method ID stored in the parent table under defaultPaymentMethodID
    * A sbscription is created for the parent on the stripe customer ID, using , where for each student the year price on the chosen frequency and is added to the items, and the parents defaultPaymentMethodID is used as `defaultPaymentMethodID`
* On payment confiramtion the parent is redirected to the parent home page `parent-portal`, with the TopBar at the top with the `parent` context. The parent portal shows each student and gives the option to add `studentItem`'s to each of the students, as well as 
to add `parentItems`'s to the parent with an update button below to execute the changes. In the TopBar there is a button to 'Payments and invoices` which redirects to a Stripe customer portal for that customer where changes to subscriptions are not allowed, but changes to payment methods are.

For a staff member:
* The staff login details are always prelocaed as name "Mr. McGregor", and password of "password", clicking on "Login" for the staff member will open a new tab at the `staff-portal` page. The TopBar changes given the role context of `staff` and has a back arrow fully left justified to the left of the logo for all pages away from the `staff-portal` page, has an emoji on the right which when clicked gives the drop down to log out which redirects to index. The top bar has linkes to `parents` and `students` pages. The `staff-portal` page shows (if possible) transactions for the account, disputes, and outstanding invoices, if this is possible with embedded components.
* The `parents` page shows a list of parents which can be filtered by a search at the top with checkoboxes next to the names. A list of `parentItems` is below with an update button at the bottom of the page. 
* For selected parents, i.e the checkbox is checked, the number of parent items is applied to those parents when update is clicked.
* Clicking on a parent takes you to a `parent?parenId=id` page which displays the parent information given the parentId.
* The `parent` page is similar to the  `parent-portal` page, allowing items to be added to students, There is a link to the Stripe portal for the parent too, but not in the top bar, as part of the page.
* The `students` page is simliar to the parents, with the studends being filtered by searching name, year, or parent, with check boxes nest to students. Each line for the students contains a checkbox, student name, year, and parent. There is a select all visible checkbox above.
* There is a list of `studentItems` below wihch can be added to the selected students on update.
* Clicking on a student will take you to the `parent` page for that student.

I have a previous project that is somewhat similar to this and am looking to reuse much of it from a architecture and building blockes perspective - look, feel, and basic functionality will need to change, but there are enough similarites that this shoul be a good indication of how to procees.

Project structure:
components:
    Contains reusablew components
data:
    Contains data files such as products.csv and inital users
lib:
    Conatains library components
pages:
    Contains our pages
    index
    sign-up
    parent-portal
    staff-portal
    parents
    parent
    students
pages/api:
    The api endpoint
public:
    Logos and such
scripts:
    The populate database and delete products and users scripts
slices:
    For slices
styles:
    Stying info


# Project structure
This project is a React+Next.js+TS+Stripe demo. The code is not production perfect as it has grown organically and agily as the demo preparation progressed. It demonstates the use of Stripe methods for capturing payment methods, creating custoemrs, products and subscriptions, and adding subscriptions, purchases to customers. This also demonstrates how webhooks can be handled, all in a fun interactive website. Enjoy.


# Operate the demo
## Preliminaries
In your Stripe (test) account you need to configure the customer dashboard, and get the keys for the application.
To create a Customer Portal configuration in Stripe:
 1. Go to your Stripe Dashboard
 2. Navigate to Settings > Billing (enable if you haven't) > Customer Portal (could be hidden under the More menu)
 3. Configure the settings according to your needs (e.g., which features to enable, branding, etc.)
 4. Save the configuration

## Setup and run
1. Copy `.env.local` to `.env` and update the details to include your Stripe (test) keys and webhook secret (see below).
2. Install the components as `npm install`
3. Generate the SSL certs as `npm run generate-cert`
4. Auth to your test account with the Stripe CLI as `stripe login`
5. Run the Stripe CLI to forward all webhooks as `stripe listen --skip-verify --forward-to https://localhost:3000/api/webhooks`
6. Ensure you update `.env` to include the webhook signing secret.
7. Populate the DB with videos and create Stripe objects required as `npx ts-node scripts/populate_database.ts`
8. Run the demo locally as `npm run dev`

## Operate the demo
1. Browse to https://localhost:3000
2. Click on _Sign up now_ and click _Create Account_. The password is always `password`.
3. Play with video and video purchases
4. Payment methds can be added either with a video purchase, through the account menu available from the top right icon then account, or via the _Add Payment Method_ button at the bottom of the page
5. The customer portal is available from the Account menu under _Manage Payments_. Have a play with removing payment methods, cancelling optional subscriptions, and the items added to the monthly billing subscription
6. Retry the user onboarding and purchase flow in _simple_ mode for a newly created user. The _Simple_ mode is available by clicking the logo on the left hand top.


## Delete and start again
1. In the Stripe dahsboard select all users and delete https://dashboard.stripe.com/test/customers
2. Archive all Stripe products created as: `npx ts-node scripts/delete_stripe_products.ts`
3. Remove the local SQLite database as: `rm mydb.sqlite`

## Modifying the content
The `populate_database.ts` script reads the two files `data/free_content.csv` and `data/premium_content.csv` to populate the local SQLite database and add a product for each premium video as well as create the free monthly placeholder subscription product. A product is created for every unique _series_ (or season), and a subscription is created for every unique _type_ (i.e movie, sport). Have fun!
