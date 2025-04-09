package com.APIprotector.apiprotector.library;

import com.APIprotector.apiprotector.service.JsonComparator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import org.openapitools.openapidiff.core.OpenApiCompare;
import org.openapitools.openapidiff.core.model.ChangedOpenApi;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;


public class CompositeDiff {
    @JsonIgnore
    private static final JsonRenderer jsonRenderer = new JsonRenderer();
    @JsonIgnore
    private static final ObjectMapper objectMapper = new ObjectMapper();
    @JsonIgnore
    private static final ObjectWriter objectWriter = objectMapper
            .setSerializationInclusion(JsonInclude.Include.NON_NULL)
            .writer();

    private final JsonNode display;
    private final JsonNode changes;

    public CompositeDiff(String previous, String current) throws JsonProcessingException {
        ChangedOpenApi diff = OpenApiCompare.fromContents(previous, current);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        OutputStreamWriter outputStreamWriter = new OutputStreamWriter(outputStream);
        jsonRenderer.render(diff, outputStreamWriter);

        display = JsonComparator.compareJsonNodes(objectMapper.readTree(previous), objectMapper.readTree(current), "", "");
        changes = objectMapper.readTree(outputStream.toString());
    }

    @Override
    public String toString() {
        try {
            return objectWriter.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public JsonNode getDisplay() {
        return display;
    }

    public JsonNode getChanges() {
        return changes;
    }
}
