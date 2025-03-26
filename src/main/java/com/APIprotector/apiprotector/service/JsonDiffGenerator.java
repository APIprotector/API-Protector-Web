package com.APIprotector.apiprotector.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public class JsonDiffGenerator {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static DiffNode generateUnifiedDiff(JsonNode obj1, JsonNode obj2) {
        DiffNode root = new DiffNode("root", "", "unchanged", null, null);
        createCompleteTree(root, obj1, obj2);
        convertChangedNodes(root);

        if (root.children.stream().anyMatch(child -> !"unchanged".equals(child.type))) {
            root.type = "changed";
        }

        return root;
    }

    private static void createCompleteTree(DiffNode root, JsonNode obj1, JsonNode obj2) {
        if ((obj1 == null || obj1.isNull()) && (obj2 == null || obj2.isNull())) {
            return;
        }
        if (obj1 == null || obj1.isNull()) {
            addObjectToTree(root, obj2, "added");
            return;
        }
        if (obj2 == null || obj2.isNull()) {
            addObjectToTree(root, obj1, "removed");
            return;
        }

        Set<String> allKeys = new HashSet<>();
        obj1.fieldNames().forEachRemaining(allKeys::add);
        obj2.fieldNames().forEachRemaining(allKeys::add);

        for (String key : allKeys) {
            JsonNode value1 = obj1.get(key);
            JsonNode value2 = obj2.get(key);
            String type;

            if (!obj1.has(key)) {
                type = "added";
            } else if (!obj2.has(key)) {
                type = "removed";
            } else if (!Objects.equals(value1, value2)) {
                type = "changed";
            } else {
                type = "unchanged";
            }

            DiffNode node = new DiffNode(key, root.path.isEmpty() ? key : root.path + "." + key, type, value1, value2);
            root.children.add(node);

            if (value1 != null && value2 != null && value1.isObject() && value2.isObject()) {
                createCompleteTree(node, value1, value2);
                if (node.children.stream().anyMatch(child -> !"unchanged".equals(child.type))) {
                    node.type = "changed";
                }
            }
        }
    }

    private static void convertChangedNodes(DiffNode node) {
        if (!node.children.isEmpty()) {
            node.children.forEach(JsonDiffGenerator::convertChangedNodes);
        }

        if ("changed".equals(node.type) && (node.value1 == null || node.value2 == null || !node.value1.isObject() || !node.value2.isObject())) {
            node.type = "removed";
        }
    }

    private static void addObjectToTree(DiffNode parent, JsonNode obj, String type) {
        if (obj == null || !obj.isObject()) {
            return;
        }
        obj.fieldNames().forEachRemaining(key -> {
            JsonNode value = obj.get(key);
            DiffNode node = new DiffNode(key, parent.path.isEmpty() ? key : parent.path + "." + key, type, type.equals("removed") ? value : null, type.equals("added") ? value : null);
            parent.children.add(node);
            if (value != null && value.isObject()) {
                addObjectToTree(node, value, type);
            }
        });
    }

    public static void main(String[] args) throws Exception {
        String json1 = "{\"name\":\"Alice\", \"age\":25, \"address\":{\"city\":\"New York\", \"zip\":\"10001\"}}";
        String json2 = "{\"name\":\"Alice\", \"age\":26, \"address\":{\"city\":\"Los Angeles\"}}";

        JsonNode obj1 = objectMapper.readTree(json1);
        JsonNode obj2 = objectMapper.readTree(json2);

        DiffNode diff = generateUnifiedDiff(obj1, obj2);
        System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(diff));
    }
}
