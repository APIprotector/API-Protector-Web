package com.APIprotector.apiprotector.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.util.Collections;
import java.util.Map;

@Service
public class OverviewService {
    private final WebClient webClient;
    private final String apiKey;
    private final String modelName;
    private final String prompt;

    public OverviewService(
            WebClient.Builder webClientBuilder,
            @Value("${gemini.api.baseurl}") String baseUrl,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.model}") String modelName,
            @Value("${gemini.task.prompt}") String prompt) {

        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalArgumentException("Gemini API key is not configured");
        }

        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("Prompt is empty or not configured");
        }

        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.prompt = prompt;
    }

    public Mono<String> getOverview(String jsonContents) {
        if (jsonContents == null || jsonContents.trim().isEmpty()) {
            System.err.println("Method called with empty or null JSON data.");
            return Mono.error(new IllegalArgumentException("Input JSON data cannot be empty."));
        }

        return sendPrompt(this.prompt + "\n\nHere is the JSON data to analyze:\n```json\n" + jsonContents + "\n```\n");
    }

    public Mono<String> sendPrompt(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            System.err.println("Method called with empty or null prompt.");
            return Mono.error(new IllegalArgumentException("Input prompt cannot be empty."));
        }

        Map<String, Object> textPart = Collections.singletonMap("text", prompt);
        Map<String, Object> partsContainer = Collections.singletonMap("parts", Collections.singletonList(textPart));
        Map<String, Object> requestBody = Collections.singletonMap("contents", Collections.singletonList(partsContainer));

        return this.webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path(this.modelName + ":generateContent")
                        .queryParam("key", this.apiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(requestBody))
                .retrieve()
                .bodyToMono(String.class);
    }
}