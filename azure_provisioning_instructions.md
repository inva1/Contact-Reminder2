# Provisioning Azure Web App and PostgreSQL Database

This guide provides step-by-step instructions to provision an Azure Web App and an Azure Database for PostgreSQL server using the Azure portal.

## I. Provision Azure Database for PostgreSQL

1.  **Navigate to Azure Database for PostgreSQL:**
    *   In the Azure portal, click on "**+ Create a resource**".
    *   Search for "**Azure Database for PostgreSQL**" and select it.
    *   Click "**Create**".

2.  **Choose Deployment Option:**
    *   Select "**Flexible server**" as the deployment option. This offers more control and is suitable for new development. Click "**Create**".

3.  **Configure PostgreSQL Server Details:**
    *   **Subscription:** Choose your Azure subscription.
    *   **Resource group:**
        *   Click "**Create new**" and provide a name (e.g., `my-app-rg`). A resource group is a container that holds related resources for an Azure solution.
    *   **Server name:** Enter a unique name for your PostgreSQL server (e.g., `my-app-db-server`). Note this down, as it will be part of your connection string.
    *   **Region:** Select a region geographically close to you or your users for optimal performance. For development, this is less critical, but good practice. (e.g., `(US) East US`).
    *   **PostgreSQL version:** Choose the latest stable version unless your application requires a specific older version.
    *   **Workload type:** Select "**Development (Smallest IOPS, Low cost)**" for now. This keeps costs down during development and testing. You can scale up later if needed.
    *   **Compute + storage:**
        *   Click "**Configure server**".
        *   Choose the "**Burstable**" compute tier (e.g., `B1ms` - 1 vCore, 2 GiB RAM, 32 GiB storage). This is the most cost-effective option for development/testing.
        *   Review the estimated monthly cost.
        *   Click "**Save**".
    *   **Availability zone:** For development, "**No preference**" is acceptable. For production, consider configuring for high availability.
    *   **Authentication:**
        *   Choose "**PostgreSQL authentication only**".
        *   **Admin username:** Create a username (e.g., `pgadmin`). **Do not use `postgres` as it might have restricted privileges.** Note this down.
        *   **Password:** Create a strong password and confirm it. **Store this securely.**
    *   Click "**Next: Networking >**".

4.  **Configure Networking:**
    *   **Connectivity method:** Select "**Public access (allowed IP addresses)**".
    *   **Firewall rules:**
        *   Click "**Add current client IP address (X.X.X.X)**". This allows you to connect to the database from your current machine using tools like `psql` or pgAdmin.
        *   **Important:** For now, we are allowing your local machine's IP. Later, you might need to add rules for your Azure Web App's outbound IP addresses once it's deployed, or configure private networking.
    *   Click "**Next: Security >**". (Default security settings are usually fine for development).
    *   Click "**Next: Tags >**". (Tags are optional for organizing resources).
    *   Click "**Next: Review + create >**".

5.  **Review and Create:**
    *   Carefully review all the settings.
    *   Click "**Create**".
    *   Deployment will take a few minutes. Wait for the "Your deployment is complete" message.

6.  **Get Database Connection String:**
    *   Go to the newly created PostgreSQL server resource.
    *   In the left-hand menu, under "**Settings**", click on "**Connection strings**".
    *   You will find various connection string formats. The **ADO.NET** (or a generic one) format is often useful:
        ```
        Server=my-app-db-server.postgres.database.azure.com;Database={your_database};Port=5432;User ID=pgadmin;Password={your_password};Ssl Mode=Require;
        ```
    *   **Note:**
        *   Replace `{your_database}` with the actual database name you intend to use. By default, a database named `postgres` is created. You can connect to this initially or create a new one using a tool like pgAdmin or `psql`. For applications, it's best to create a dedicated database.
        *   Replace `{your_password}` with the admin password you set.
        *   Keep this connection string safe.

## II. Provision Azure Web App

1.  **Navigate to Web Apps:**
    *   In the Azure portal, click on "**+ Create a resource**".
    *   Search for "**Web App**" and select it.
    *   Click "**Create**".

2.  **Configure Web App Details:**
    *   **Subscription:** Choose your Azure subscription.
    *   **Resource group:** Select the same resource group you created for the database (e.g., `my-app-rg`).
    *   **Name:** Enter a unique name for your web app (e.g., `my-cool-webapp`). This will be part of its URL (`my-cool-webapp.azurewebsites.net`).
    *   **Publish:** Choose "**Code**". (You can also choose Docker Container if you are deploying a containerized app).
    *   **Runtime stack:** Select the appropriate runtime for your application (e.g., Python 3.9, Node 18 LTS, .NET 7, etc.).
    *   **Operating System:** Choose based on your runtime stack preference (Linux is often more cost-effective and common for many stacks).
    *   **Region:** Select the **same region** you used for your PostgreSQL database. This minimizes latency between your app and database.
    *   **App Service Plan:**
        *   An App Service Plan defines the location, size, features, and cost of your web app.
        *   Click "**Create new**" if you don't have a suitable existing one.
        *   Name your App Service Plan (e.g., `my-app-service-plan`).
        *   **Pricing tier (Sku and size):**
            *   Click "**Change size**".
            *   For development and testing, select one of the "**Dev / Test**" tiers like "**F1 (Free)**" or "**B1 (Basic)**".
            *   **F1 (Free):** Good for initial experimentation, but has limitations (no custom domain, limited resources, shared infrastructure).
            *   **B1 (Basic):** A good starting point for development, offering dedicated resources and custom domain capabilities.
            *   Review the features and costs, then click "**Apply**".
    *   Click "**Next: Deployment >**". (You can configure CI/CD here later if needed).
    *   Click "**Next: Networking >**".

3.  **Configure Networking (Web App):**
    *   **Enable public access:** On.
    *   **Enable network injection:** Off (for now, simpler setup).
    *   **Inbound access:** HTTP and HTTPS allowed.
    *   Click "**Next: Monitoring >**".

4.  **Configure Monitoring:**
    *   **Enable Application Insights:**
        *   It's highly recommended to enable Application Insights. It provides powerful monitoring and diagnostics for your application.
        *   Select "**Yes**" and either create a new Application Insights resource or select an existing one.
    *   Click "**Next: Tags >**".
    *   Click "**Next: Review + create >**".

5.  **Review and Create:**
    *   Carefully review all the settings.
    *   Click "**Create**".
    *   Deployment will take a few minutes.

## III. Key Considerations & Next Steps

*   **Database Creation:** The PostgreSQL server is provisioned, but you might need to create a specific database for your application if you don't want to use the default `postgres` database. You can do this using:
    *   `psql` command-line tool (connect using the client IP you allowed in the firewall).
    *   A GUI tool like pgAdmin.
    *   Many application frameworks can also create the database on first run if the user has creation privileges.
*   **Firewall Rules for Web App:**
    *   Once your Web App is deployed, it will have outbound IP addresses. For enhanced security, you might want to restrict your PostgreSQL server's firewall rules to *only* allow access from these Web App IPs instead of your local machine's IP (especially for non-development environments).
    *   You can find the Web App's outbound IPs in its "**Properties**" section in the Azure portal. Add these to the PostgreSQL server's firewall rules.
*   **Application Configuration:**
    *   Your Web App will need the database connection string to connect to the PostgreSQL server.
    *   Store this connection string securely in the Web App's "**Configuration**" section (under "Application settings"). **Do not hardcode connection strings in your application code.**
*   **Cost Management:** Regularly review your Azure costs. The selected tiers (Burstable for PostgreSQL, Free/Basic for Web App) are cost-effective for development, but be mindful of scaling and usage.
*   **Security:**
    *   Use strong, unique passwords.
    *   Keep SSL Mode as `Require` or higher for database connections.
    *   Regularly update firewall rules.
    *   Consider using Azure Key Vault for managing secrets like connection strings, especially for production.
    *   For production, explore private networking options (e.g., VNet integration for Web App, Private Endpoint for PostgreSQL) to avoid exposing your database to the public internet.

This guide provides a basic setup. Azure offers many more features for scalability, security, and management that you can explore as your application evolves.
