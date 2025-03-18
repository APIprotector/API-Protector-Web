package com.APIprotector.apiprotector.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import com.APIprotector.apiprotector.service.DiffService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/diff")
public class DiffController {
    private final DiffService diffService;
    private final ObjectMapper objectMapper;

    @Autowired
    public DiffController(DiffService diffService, ObjectMapper objectMapper) {
        this.diffService = diffService;
        this.objectMapper = objectMapper;
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public String getSpecsToDiff(@RequestBody Map<String, Object> map) throws Exception {
        Object previous = map.get("previous");
        String previouAsString = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(previous);
        Object current = map.get("current");
        String currentAsString = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(current);

        return diffService.diff(previouAsString, currentAsString);
    }
}
