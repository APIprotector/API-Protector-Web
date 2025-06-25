# API Protector

This project develops a web application that allows users to compare two API documents in OpenAPI Specification (OAS) 2 or OAS 3 standards and highlights their differences using visual cues and natural language. It also warns about backward-incompatible changes, making it easier to assess the impact of planned API modifications.

## Running Locally with Docker

To get the SmartBear API Difference Analyzer up and running on your local machine using Docker, follow these simple steps:

### Prerequisites

*   **Docker:** Make sure you have Docker installed and running on your system. You can download it from [https://www.docker.com/get-started](https://www.docker.com/get-started).
*   **Gemini API Key:** The application utilizes a language model (Gemini) for natural language output. You'll need to obtain a Gemini API key. If you don't have one, you can typically get one from the Google AI Studio or Google Cloud Console.

### Steps to Run

1.  **Retrieve the Newest Docker Tag:**
    Before running the command, you'll need the latest tag for the `piachsecki/apiprotector` Docker image. You can find this on Docker Hub:
    [https://hub.docker.com/r/piachsecki/apiprotector/tags](https://hub.docker.com/r/piachsecki/apiprotector/tags)

    Look for the tag marked as "latest" or the most recently pushed version.

2.  **Run the Docker Command:**
    Open your terminal or command prompt and execute the following command. Replace `<api_key>` with your actual Gemini API key and `<newest_tag>` with the tag you found in the previous step.

    ```bash
    docker run -d -p 3000:8080 -e GEMINI_API_KEY=<api_key> piachsecki/apiprotector:<newest_tag>
    ```

    *   `-d`: Runs the Docker container in detached mode (in the background).
    *   `-p 3000:8080`: Maps port 3000 on your local machine to port 8080 inside the Docker container. This means you can access the application via `http://localhost:3000`.
    *   `-e GEMINI_API_KEY=<api_key>`: Passes your Gemini API key as an environment variable to the container, which the application uses to access the language model.
    *   `piachsecki/apiprotector:<newest_tag>`: Specifies the Docker image to pull and run, using the latest available version.

3.  **Access the Application:**
    Once the command has successfully executed, the web application should be running. Open your web browser and navigate to:

    ```
    http://localhost:3000
    ```

    You should now see the API Protector interface!
