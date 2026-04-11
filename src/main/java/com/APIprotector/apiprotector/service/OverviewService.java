package com.APIprotector.apiprotector.service;

import com.APIprotector.apiprotector.jtt.JSONLexer;
import com.APIprotector.apiprotector.jtt.JSONParser;
import com.APIprotector.apiprotector.jtt.ToonListener;
import java.util.Objects;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.tree.*;
import org.stringtemplate.v4.*;
import java.io.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

@Service
public class OverviewService {
    private final WebClient webClient;
    private final String apiKey;
    private final String modelName;
    private final String prompt;
    private final Boolean toon;

    public OverviewService(
            WebClient.Builder webClientBuilder,
            @Value("${gemini.api.baseurl}") String baseUrl,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.model}") String modelName,
            @Value("${gemini.task.prompt}") String prompt,
            @Value("${toon}") String toon
        ) {

        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("Prompt is empty or not configured");
        }

        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .defaultHeaders(headers -> headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                .build();
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.prompt = prompt;
        this.toon = Objects.equals(toon, "true");
    }

    public Mono<String> getOverview(String jsonContents) {
        if (jsonContents == null || jsonContents.trim().isEmpty()) {
            System.err.println("Method called with empty or null JSON data.");
            return Mono.error(new IllegalArgumentException("Input JSON data cannot be empty."));
        }

        if (this.apiKey == null || this.apiKey.trim().isEmpty()) {
            return Mono.just("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"# AI overview is currently unavailable.\"}]}}]}");
        }

        if (this.toon) {
            CharStream input = CharStreams.fromString(jsonContents);
            JSONLexer lexer = new JSONLexer(input);
            CommonTokenStream tokens = new CommonTokenStream(lexer);
            JSONParser parser = new JSONParser(tokens);
            JSONParser.JsonContext tree = parser.json();

            ParseTreeWalker walker = new ParseTreeWalker();
            ToonListener listener = new ToonListener();
            walker.walk(listener, tree);
            ST result = listener.getResult(tree);

            return sendPrompt(this.prompt + "\n\nHere is the TOON data to analyze:\n```toon\n" + result.render() + "\n```\n");
        } else {
            return sendPrompt(this.prompt + "\n\nHere is the JSON data to analyze:\n```json\n" + jsonContents + "\n```\n");
        }
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
                .bodyToMono(String.class)
                .timeout(Duration.ofMinutes(5));
    }
}