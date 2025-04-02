package com.APIprotector.apiprotector.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.*;

public class DiffGenerator {
    public static DiffNode generateUnifiedDiff(Map<String, Object> obj1, Map<String, Object> obj2) throws IOException {
        var root = new DiffNode("root", "", "unchanged", null, null);
        createCompleteTree(root, obj1, obj2);
        convertChangedNodes(root);

        if (root.children.stream().anyMatch(child -> !"unchanged".equals(child.type))) {
            root.type = "changed";
        }
        return root;
    }

    private static void createCompleteTree(DiffNode root, Map<String, Object> obj1, Map<String, Object> obj2) throws IOException {
        if ((obj1 == null || obj1.isEmpty()) && (obj2 == null || obj2.isEmpty())) {
            return;
        }
        if (obj1 == null) {
            addObjToTree(root, obj2, "added");
            return;
        }
        if (obj2 == null) {
            addObjToTree(root, obj1, "removed");
            return;
        }

        Set<String> allKeys = new HashSet<>();
        allKeys.addAll(obj1.keySet());
        allKeys.addAll(obj2.keySet());

        for (String key : allKeys) {
            Object value1 = obj1.get(key);
            Object value2 = obj2.get(key);
            String type;

            if (!obj1.containsKey(key)) {
                type = "added";
            } else if (!obj2.containsKey(key)) {
                type = "removed";
            } else if (!Objects.equals(value1, value2)) {
                type = "changed";
            } else {
                type = "unchanged";
            }
            var node = new DiffNode(key,
                    root.path.isEmpty() ? key : root.path + "." + key,
                    type,
                    new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(value1)),
                    new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(value2)));
            root.children.add(node);

            if (type.equals("added") && value2 instanceof Map) {
                addObjToTree(node, (Map<String, Object>) value2, "added");
            } else if (type.equals("removed") && value1 instanceof Map) {
                addObjToTree(node, (Map<String, Object>) value1, "removed");
            } else if (value1 instanceof Map && value2 instanceof Map) {
                createCompleteTree(node, (Map<String, Object>) value1, (Map<String, Object>) value2);
                if (node.children.stream().anyMatch(child -> !"unchanged".equals(child.type))) {
                    node.type = "changed";
                }
            }
        }
    }

    private static void convertChangedNodes(DiffNode node) {
        if (node.children != null && !node.children.isEmpty()) {
            node.children.forEach(DiffGenerator::convertChangedNodes);
        }
    }

    private static void addObjToTree(DiffNode parent, Map<String, Object> obj, String type) throws JsonProcessingException {
        if (obj == null) {
            return;
        }

        for (Map.Entry<String, Object> entry : obj.entrySet()) {
            DiffNode node = new DiffNode(
                    entry.getKey(),
                    parent.path + "." + entry.getKey(),
                    type,
                    type.equals("removed") ?
                            new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(entry.getValue())) :
                            null,
                    type.equals("added") ?
                            new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(entry.getValue())) :
                            null);

            parent.children.add(node);

            if (entry.getValue() instanceof Map) {
                addObjToTree(node, (Map<String, Object>) entry.getValue(), type);
            }
        }
    }
}
