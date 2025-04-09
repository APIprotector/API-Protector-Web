package com.APIprotector.apiprotector.controller;

import com.APIprotector.apiprotector.library.CompositeDiff;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;

import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/diff")
public class DiffController {
    private final ObjectMapper objectMapper;

    public DiffController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public String getSpecsToDiff(@RequestBody Map<String, Object> map) throws IOException {
        Object previous = map.get("previous");
        Object current = map.get("current");

        String previousAsString = objectMapper.writeValueAsString(previous);
        String currentAsString = objectMapper.writeValueAsString(current);

        return new CompositeDiff(previousAsString, currentAsString).toString();
    }
}
