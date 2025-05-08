package com.APIprotector.apiprotector.controller;

import com.APIprotector.apiprotector.service.OverviewService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/overview")
public class OverviewController {

    private final OverviewService overviewService;
    private final ObjectMapper objectMapper;

    @Autowired
    public OverviewController(OverviewService overviewService, ObjectMapper objectMapper) {
        this.overviewService = overviewService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<String>> generateOverview(@RequestBody String jsonContents) {
        if (jsonContents == null || jsonContents.trim().isEmpty()) {
            return Mono.just(ResponseEntity.badRequest().body("Request body (JSON string) cannot be empty."));
        }

        try {
            objectMapper.readTree(jsonContents);
        } catch (JsonProcessingException e) {
            return Mono.just(ResponseEntity.badRequest().body("Invalid JSON format in request body: " + e.getMessage()));
        }

        return null;
    }
}
