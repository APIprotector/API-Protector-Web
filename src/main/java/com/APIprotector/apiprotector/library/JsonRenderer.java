package com.APIprotector.apiprotector.library;

import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.Schema;
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
import java.util.function.BiConsumer;

public class JsonRenderer implements Render {
    protected ChangedOpenApi diff;

    public JsonRenderer() {
    }

    @Override
    public void render(ChangedOpenApi diff, OutputStreamWriter outputStreamWriter) {
        this.diff = diff;

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("title", diff.getNewSpecOpenApi().getInfo().getTitle());
        result.put("compatible", diff.isCompatible());

        result.put("newEndpoints", endpointsToList(diff.getNewEndpoints()));
        result.put("missingEndpoints", endpointsToList(diff.getMissingEndpoints()));
        result.put("deprecatedEndpoints", endpointsToList(diff.getDeprecatedEndpoints()));
        result.put("changedOperations", changedOperationsToList(diff.getChangedOperations()));
        result.put("changedSchemas", changedSchemasToSet(diff.getChangedSchemas()));

        ObjectMapper objectMapper = new ObjectMapper();
        try {
            objectMapper.writer().writeValue(outputStreamWriter, result);
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
                item.put("compatible", op.isCompatible());
                item.put("method", op.getHttpMethod().toString());
                item.put("path", op.getPathUrl());
                item.put("summary", Optional.ofNullable(op.getSummary()).map(e -> e.getLeft() + " -> " + e.getRight()).orElse(null));
                item.put("description", Optional.ofNullable(op.getDescription()).map(e -> e.getLeft() + " -> " + e.getRight()).orElse(null));
                item.put("operationId", Optional.ofNullable(op.getOperationId()).map(e -> e.getLeft() + " -> " + e.getRight()).orElse(null));
                item.put("parameters", paramChanges(op.getParameters()));
                if (op.getRequestBody() != null) {
                    item.put("requestBody", contentChanges(op.getRequestBody().getContent()));
                } else {
                    item.put("requestBody", new ArrayList<>());
                }
                item.put("responses", responseChanges(op.getApiResponses()));

                list.add(item);
            }
        }
        return list;
    }

    private Set<Map<String, Object>> changedSchemasToSet(List<ChangedSchema> schemas) {
        Set<Map<String, Object>> set = new HashSet<>();
        for (ChangedSchema schema : schemas) {
            Map<String, Object> result = schemaChanges(schema);
            if (result != null) {
                set.add(result);
            }
        }
        return set;
    }


    private List<Map<String, Object>> paramChanges(ChangedParameters changedParams) {
        List<Map<String, Object>> params = new ArrayList<>();
        if (changedParams == null) return params;

        for (Parameter param : changedParams.getIncreased()) {
            params.add(Map.of("action", "add", "name", param.getName(), "in", param.getIn(), "$ref", param.get$ref()));
        }

        for (ChangedParameter changed : changedParams.getChanged()) {
            if (changed.isDeprecated()){
                Parameter newParam = changed.getNewParameter();
                params.add(Map.of("action", "deprecated", "name", newParam.getName(), "in", newParam.getIn()));
            } else {
                Parameter newParam = changed.getNewParameter();
                params.add(Map.of("action", "changed", "name", newParam.getName(), "in", newParam.getIn(), "compatible", changed.isCompatible()));
            }
        }

        for (Parameter param : changedParams.getMissing()) {
            params.add(Map.of("action", "delete", "name", param.getName(), "in", param.getIn(), "$ref", param.get$ref()));
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
                        "compatible", mediaType.isCompatible(),
                        "schema", schemaChanges(mediaType.getSchema())
                )));
        return content;
    }

    private List<Map<String, Object>> contentChanges(ChangedContent changedContent, Content oldContent, Content newContent) {
        List<Map<String, Object>> content = new ArrayList<>();
        if (changedContent == null) return content;
        changedContent.getIncreased().forEach((type, value) ->
                content.add(Map.of("action", "add", "contentType", type)));

        changedContent.getMissing().forEach((type, value) ->
                content.add(Map.of("action", "delete", "contentType", type)));

        changedContent.getChanged().forEach((type, mediaType) -> {
            content.add(Map.of(
                    "action", "change",
                    "contentType", type,
                    "compatible", mediaType.isCompatible(),
                    "schema", schemaChanges(mediaType.getSchema()
                            ,oldContent.get(type).getSchema()
                            ,newContent.get(type).getSchema())
            ));
        });
        return content;
    }

    private List<Map<String, Object>> responseChanges(ChangedApiResponse responses) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (responses == null) return result;
        responses.getIncreased().forEach((code, value) ->
                result.add(Map.of("action", "add", "code", code)));

        responses.getMissing().forEach((code, value) ->
                result.add(Map.of("action", "delete", "code", code)));

        responses.getChanged().forEach((code, changed) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("action", "change");
            entry.put("code", code);
            entry.put("mediaTypes", contentChanges(changed.getContent()
                    ,changed.getNewApiResponse().getContent()
                    ,changed.getOldApiResponse().getContent()));
            result.add(entry);
        });

        return result;
    }

    private Map<String, Object> schemaChanges(ChangedSchema schema) {
        Map<String, Object> entry = new LinkedHashMap<>();
        if (schema.isChangedType()) {
            entry.put("changedType", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getType() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getType() : null
            ));
        } else {
            entry.put("changedType", new ArrayList<>());
        }

        if (schema.isChangeFormat()) {
            entry.put("changedFormat", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getFormat() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getFormat() : null
            ));
        } else {
            entry.put("changedFormat", new ArrayList<>());
        }

        if (schema.isChangeDefault()) {
            entry.put("changedDefault", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getDefault() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getDefault() : null
            ));
        } else {
            entry.put("changedDefault", new ArrayList<>());
        }

        if (schema.isChangeDeprecated()) {
            entry.put("changedDeprecated", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getDeprecated() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getDeprecated() : null
            ));
        } else {
            entry.put("changedDefault", new ArrayList<>());
        }

        if (!schema.getChangedProperties().isEmpty()) {
            List<Map<String, Object>> changedProps = new ArrayList<>();
            for (Map.Entry<String, ChangedSchema> changed : schema.getChangedProperties().entrySet()) {
                Map<String, Object> nestedChange = schemaChanges(changed.getValue());
                if (!nestedChange.isEmpty()) {
                    changedProps.add(nestedChange);
                    changedProps.add(Map.of(
                            "name", changed.getKey(),
                            "changes", compareSchemas(schema.getOldSchema().getProperties().get(changed.getKey()),schema.getNewSchema().getProperties().get(changed.getKey()))
                    ));
                }
            }
            if (!changedProps.isEmpty()) {
                entry.put("changedProperties", changedProps);
            }
        } else {
            entry.put("changedProperties", new ArrayList<>());
        }
        return entry;
    }

    private Map<String, Object> schemaChanges(ChangedSchema schema, Schema<?> oldSchema, Schema<?> newSchema) {
        Map<String, Object> entry = new LinkedHashMap<>();
        if (oldSchema.get$ref() != null && newSchema.get$ref() != null) {
            String oldPath = oldSchema.get$ref();
            String newPath = newSchema.get$ref();
            String oldTitle = oldPath.substring(oldSchema.get$ref().lastIndexOf("/") + 1);
            String newTitle = newPath.substring(newSchema.get$ref().lastIndexOf("/") + 1);
            entry.put("ref", oldPath.equals(newPath) ? oldPath : null);
            entry.put("title", oldTitle.equals(newTitle) ?  oldTitle : null);

        }
        if (schema.isChangedType()) {
            entry.put("changedType", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getType() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getType() : null
            ));
        } else {
            entry.put("changedType", new ArrayList<>());
        }

        if (schema.isChangeFormat()) {
            entry.put("changedFormat", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getFormat() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getFormat() : null
            ));
        } else {
            entry.put("changedFormat", new ArrayList<>());
        }
        if (schema.isChangeDefault()) {
            entry.put("changedDefault", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getDefault() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getDefault() : null
            ));
        } else {
            entry.put("changedDefault", new ArrayList<>());
        }

        if (schema.isChangeDeprecated()) {
            entry.put("changedDeprecated", Map.of(
                    "before", schema.getOldSchema() != null ? schema.getOldSchema().getDeprecated() : null,
                    "after", schema.getNewSchema() != null ? schema.getNewSchema().getDeprecated() : null
            ));
        } else {
            entry.put("changedDefault", new ArrayList<>());
        }

        if (!schema.getChangedProperties().isEmpty()) {
            List<Map<String, Object>> changedProps = new ArrayList<>();
            for (ChangedSchema changed : schema.getChangedProperties().values()) {
                Map<String, Object> nestedChange = schemaChanges(changed);
                if (!nestedChange.isEmpty()) {
                    changedProps.add(nestedChange);
                }
            }
            if (!changedProps.isEmpty()) {
                entry.put("changedProperties", changedProps);
            }
        } else {
            entry.put("changedProperties", new ArrayList<>());
        }
        return entry;
    }

    public Map<String, Map<String, Object>> compareSchemas(Schema<?> s1, Schema<?> s2) {
        Map<String, Map<String, Object>> changes = new LinkedHashMap<>();

        if (s1 == null) {
            return changes;
        }
        if (s2 == null) {
            return changes;
        }

        BiConsumer<String, Object[]> addDiff = (field, values) -> {
            if (!Objects.equals(values[0], values[1])) {
                changes.put(field, Map.of(
                        "before", values[0],
                        "after", values[1]
                ));
            }
        };

        addDiff.accept("title", new Object[]{s1.getTitle(), s2.getTitle()});
        addDiff.accept("type", new Object[]{s1.getType(), s2.getType()});
        addDiff.accept("format", new Object[]{s1.getFormat(), s2.getFormat()});
        addDiff.accept("description", new Object[]{s1.getDescription(), s2.getDescription()});
        addDiff.accept("pattern", new Object[]{s1.getPattern(), s2.getPattern()});
        addDiff.accept("maximum", new Object[]{s1.getMaximum(), s2.getMaximum()});
        addDiff.accept("minimum", new Object[]{s1.getMinimum(), s2.getMinimum()});
        addDiff.accept("exclusiveMaximum", new Object[]{s1.getExclusiveMaximum(), s2.getExclusiveMaximum()});
        addDiff.accept("exclusiveMinimum", new Object[]{s1.getExclusiveMinimum(), s2.getExclusiveMinimum()});
        addDiff.accept("maxLength", new Object[]{s1.getMaxLength(), s2.getMaxLength()});
        addDiff.accept("minLength", new Object[]{s1.getMinLength(), s2.getMinLength()});
        addDiff.accept("multipleOf", new Object[]{s1.getMultipleOf(), s2.getMultipleOf()});
        addDiff.accept("required", new Object[]{s1.getRequired(), s2.getRequired()});
        addDiff.accept("readOnly", new Object[]{s1.getReadOnly(), s2.getReadOnly()});
        addDiff.accept("writeOnly", new Object[]{s1.getWriteOnly(), s2.getWriteOnly()});
        addDiff.accept("nullable", new Object[]{s1.getNullable(), s2.getNullable()});
        addDiff.accept("deprecated", new Object[]{s1.getDeprecated(), s2.getDeprecated()});

        // Compare property keys only, not deep comparison
        Set<String> s1Keys = s1.getProperties() != null ? s1.getProperties().keySet() : null;
        Set<String> s2Keys = s2.getProperties() != null ? s2.getProperties().keySet() : null;
        addDiff.accept("properties", new Object[]{s1Keys, s2Keys});

        // Shallow item diff
        addDiff.accept("items", new Object[]{s1.getItems(), s2.getItems()});

        return changes;
    }
}
