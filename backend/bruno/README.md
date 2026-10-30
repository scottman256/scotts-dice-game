# Bruno setup

1. [Download Bruno](https://www.usebruno.com/downloads), run the installer, and open the app.
2. Start the backend from the project root in Windows Command Prompt:

   ```cmd
   cd backend
   gradlew.bat bootRun
   ```

3. In `backend/bruno`, copy `.env.example` to `.env` if it does not already exist. Edit your login credentials there; this file is ignored by Git.
4. In Bruno, choose **Open Collection** and select the `backend/bruno` folder containing `bruno.json`.
5. Select the **Local** environment and send **01 Public / Health check**.
6. Under **02 Authentication**, send **Login player** or **Login admin**, then open an API request, edit its example data, and click **Send**. Tokens are shared automatically with the matching requests.

Each request's **Docs** tab explains its inputs and prerequisites. For full collection runs against a temporary database, see the [testing guide](GUIDE.md).
