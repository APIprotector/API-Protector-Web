package com.APIprotector.apiprotector.library;

import io.swagger.v3.oas.models.parameters.Parameter;
import org.openapitools.openapidiff.core.exception.RendererException;
import org.openapitools.openapidiff.core.model.*;
import org.openapitools.openapidiff.core.output.Render;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class JsonRenderer implements Render {
    protected ChangedOpenApi diff;

    public JsonRenderer() {
    }

    @Override
    public void render(ChangedOpenApi diff, OutputStreamWriter outputStreamWriter) {
        this.diff = diff;

        Map<String, Object> result = new LinkedHashMap<>();

        if (diff.isUnchanged()) {
            result.put("message", "No differences. Specifications are equivalent.");
        } else {
            result.put("title", diff.getNewSpecOpenApi().getInfo().getTitle());
            result.put("compatible", diff.isCompatible());

            result.put("newEndpoints", endpointsToList(diff.getNewEndpoints()));
            result.put("missingEndpoints", endpointsToList(diff.getMissingEndpoints()));
            result.put("deprecatedEndpoints", endpointsToList(diff.getDeprecatedEndpoints()));
            result.put("changedOperations", changedOperationsToList(diff.getChangedOperations()));
        }

        ObjectMapper objectMapper = new ObjectMapper();
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputStreamWriter, result);
            outputStreamWriter.close();
        } catch (IOException e) {
            throw new RendererException(e);
        }
    }

    private List<Map<String, Object>> endpointsToList(List<Endpoint> endpoints) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (endpoints != null) {
            for (Endpoint endpoint : endpoints) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("method", endpoint.getMethod().toString());
                item.put("path", endpoint.getPathUrl());
                item.put("summary", endpoint.getSummary());
                list.add(item);
            }
        }
        return list;
    }

    private List<Map<String, Object>> changedOperationsToList(List<ChangedOperation> operations) {
        List<Map<String, Object>> list = new ArrayList<>();
        if (operations != null) {
            for (ChangedOperation op : operations) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("method", op.getHttpMethod().toString());
                item.put("path", op.getPathUrl());
                item.put("summary", Optional.ofNullable(op.getSummary()).map(ChangedMetadata::getRight).orElse(""));

                if (Changed.result(op.getParameters()).isDifferent()) {
                    item.put("parameters", paramChanges(op.getParameters()));
                }

                if (op.resultRequestBody().isDifferent()) {
                    item.put("requestBody", contentChanges(op.getRequestBody().getContent()));
                }

                if (op.resultApiResponses().isDifferent()) {
                    item.put("responses", responseChanges(op.getApiResponses()));
                }

                list.add(item);
            }
        }
        return list;
    }

    private List<Map<String, Object>> paramChanges(ChangedParameters changedParams) {
        List<Map<String, Object>> params = new ArrayList<>();

        for (Parameter param : changedParams.getIncreased()) {
            params.add(Map.of("action", "add", "name", param.getName(), "in", param.getIn()));
        }

        for (ChangedParameter changed : changedParams.getChanged()) {
            String action = changed.isDeprecated() ? "deprecated" : "changed";
            Parameter newParam = changed.getNewParameter();
            params.add(Map.of("action", action, "name", newParam.getName(), "in", newParam.getIn()));
        }

        for (Parameter param : changedParams.getMissing()) {
            params.add(Map.of("action", "delete", "name", param.getName(), "in", param.getIn()));
        }

        return params;
    }

    private List<Map<String, Object>> contentChanges(ChangedContent changedContent) {
        List<Map<String, Object>> content = new ArrayList<>();
        if (changedContent == null) return content;

        changedContent.getIncreased().forEach((type, value) ->
                content.add(Map.of("action", "add", "contentType", type)));

        changedContent.getMissing().forEach((type, value) ->
                content.add(Map.of("action", "delete", "contentType", type)));

        changedContent.getChanged().forEach((type, mediaType) ->
                content.add(Map.of(
                        "action", "change",
                        "contentType", type,
                        "compatible", mediaType.isCompatible()
                )));

        return content;
    }

    private List<Map<String, Object>> responseChanges(ChangedApiResponse responses) {
        List<Map<String, Object>> result = new ArrayList<>();

        responses.getIncreased().forEach((code, value) ->
                result.add(Map.of("action", "add", "code", code)));

        responses.getMissing().forEach((code, value) ->
                result.add(Map.of("action", "delete", "code", code)));

        responses.getChanged().forEach((code, changed) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("action", "change");
            entry.put("code", code);
            entry.put("mediaTypes", contentChanges(changed.getContent()));
            result.add(entry);
        });

        return result;
    }
}
