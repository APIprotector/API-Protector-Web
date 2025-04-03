package com.APIprotector.apiprotector.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.File;
import java.util.Iterator;
import java.util.Map;

public class JsonComparator {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        // Load JSON files into JsonNode
        JsonNode json1 = objectMapper.readTree(new File("C:\\Users\\Kamil\\Desktop\\APISpecs\\openapi-test1.json"));
        JsonNode json2 = objectMapper.readTree(new File("C:\\Users\\Kamil\\Desktop\\APISpecs\\openapi-test3.json"));

        // Compare JSONs and generate difference tree
        JsonNode diffTree = compareJsonNodes(json1, json2, "");

        // Print structured JSON difference
        System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(diffTree));
    }

    public static JsonNode compareJsonNodes(JsonNode node1, JsonNode node2, String path) {
        ObjectNode resultNode = objectMapper.createObjectNode();
        ArrayNode children = objectMapper.createArrayNode();

        // Define type of change
        String changeType;
        if (node1 == null || node1.isMissingNode()) {
            changeType = "added";
        } else if (node2 == null || node2.isMissingNode()) {
            changeType = "removed";
        } else if (node1.equals(node2)) {
            changeType = "unchanged";
        } else {
            changeType = "changed";
        }

        // Handle Object nodes (nested structures)
        if (node1 != null && node1.isObject() && node2 != null && node2.isObject()) {
            // Compare all keys in node1
            Iterator<Map.Entry<String, JsonNode>> fields = node1.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                String newPath = path.isEmpty() ? key : path + "." + key;
                JsonNode childNode = compareJsonNodes(entry.getValue(), node2.get(key), newPath);
                children.add(childNode);
            }
            // Check for new fields in node2 (additions)
            Iterator<String> fieldNames = node2.fieldNames();
            while (fieldNames.hasNext()) {
                String key = fieldNames.next();
                if (!node1.has(key)) {
                    String newPath = path.isEmpty() ? key : path + "." + key;
                    JsonNode childNode = compareJsonNodes(null, node2.get(key), newPath);
                    children.add(childNode);
                }
            }
        }
        // Handle Arrays
        else if (node1 != null && node1.isArray() && node2 != null && node2.isArray()) {
            int maxSize = Math.max(node1.size(), node2.size());
            for (int i = 0; i < maxSize; i++) {
                String newPath = path + "[" + i + "]";
                JsonNode val1 = i < node1.size() ? node1.get(i) : null;
                JsonNode val2 = i < node2.size() ? node2.get(i) : null;
                JsonNode childNode = compareJsonNodes(val1, val2, newPath);
                children.add(childNode);
            }
        }

        // Populate result node
        resultNode.put("key", path.substring(path.lastIndexOf('.') + 1));
        resultNode.put("path", path);
        resultNode.put("type", changeType);

        if (changeType.equals("unchanged")) {
            resultNode.set("value1", node1);
            resultNode.set("value2", null);
            if (!children.isEmpty()) {
                resultNode.set("children", children);
            }
            return resultNode;
        }

        if (changeType.equals("added")) {
            resultNode.set("value1", null);
            resultNode.set("value2", node2 != null && !node2.isMissingNode() ? node2 : null);
            if (!children.isEmpty()) {
                resultNode.set("children", children);
            }

            return resultNode;
        }

        resultNode.set("value1", node1 != null && !node1.isMissingNode() ? node1 : null);
        resultNode.set("value2", node2 != null && !node2.isMissingNode() ? node2 : null);
        if (!children.isEmpty()) {
            resultNode.set("children", children);
        }

        return resultNode;
    }
}