package com.APIprotector.apiprotector.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.*;

public class JsonComparator {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static JsonNode compareJsonNodes(JsonNode node1, JsonNode node2, String path, String nodeKey) {
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
                JsonNode childNode = compareJsonNodes(entry.getValue(), node2.get(key), newPath, key);
                children.add(childNode);
            }
            // Check for new fields in node2 (additions)
            Iterator<String> fieldNames = node2.fieldNames();
            while (fieldNames.hasNext()) {
                String key = fieldNames.next();
                if (!node1.has(key)) {
                    String newPath = path.isEmpty() ? key : path + "." + key;
                    JsonNode childNode = compareJsonNodes(null, node2.get(key), newPath, key);
                    children.add(childNode);
                }
            }
        }
        // iterate over nodes even if one of them is null
        else if (node1 != null && node1.isObject() && node2 == null) {
            Iterator<Map.Entry<String, JsonNode>> fields = node1.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                String newPath = path.isEmpty() ? key : path + "." + key;
                JsonNode childNode = compareJsonNodes(entry.getValue(), null, newPath, key);
                children.add(childNode);
            }
        }
        // ditto
        else if (node1 == null && node2 != null && node2.isObject()) {
            Iterator<String> fieldNames = node2.fieldNames();
            while (fieldNames.hasNext()) {
                String key = fieldNames.next();
                    String newPath = path.isEmpty() ? key : path + "." + key;
                    JsonNode childNode = compareJsonNodes(null, node2.get(key), newPath, key);
                    children.add(childNode);
            }
        }

        // Handle Array nodes
        else if (node1 != null && node1.isArray() && node2 != null && node2.isArray()) {
            List<JsonNode> list1 = new ArrayList<>();
            List<JsonNode> list2 = new ArrayList<>();
            node1.forEach(list1::add);
            node2.forEach(list2::add);
            int i = 0;

            // Identify removed items (exist in list1 but not in list2)
            for (JsonNode node : list1) {
                if (!containsNode(list2, node)) {
                    String newPath = path + "[" + i + "]";
                    JsonNode childNode = compareJsonNodes(node, null, newPath, nodeKey + "[" + i + "]");
                    children.add(childNode);
                    i++;
                }
            }

            // Identify added items (exist in list2 but not in list1)
            for (JsonNode node : list2) {
                if (!containsNode(list1, node)) {
                    String newPath = path + "[" + i + "]";
                    JsonNode childNode = compareJsonNodes(null, node, newPath, nodeKey + "[" + i + "]");
                    children.add(childNode);
                    i++;
                }
            }

            // Identify changed items (same structure but different values)
            for (JsonNode nodeNo1 : list1) {
                for (JsonNode nodeNo2 : list2) {
                    if (isSimilar(nodeNo1, nodeNo2) && !nodeNo1.equals(nodeNo2)) {
                        String newPath = path + "[" + i + "]";
                        JsonNode childNode = compareJsonNodes(nodeNo1, nodeNo2, newPath, nodeKey + "[" + i + "]");
                        children.add(childNode);
                        i++;
                    }
                }
            }
            // Identify unchanged items (same structure and same values)
            for (JsonNode nodeNo1 : list1) {
                for (JsonNode nodeNo2 : list2) {
                    if (nodeNo1.equals(nodeNo2)) {
                        String newPath = path + "[" + i + "]";
                        JsonNode childNode = compareJsonNodes(nodeNo1, nodeNo2, newPath, nodeKey + "[" + i + "]");
                        children.add(childNode);
                        i++;
                    }
                }
            }
        }
        // iterate over array node even if one of them is null
        else if (node1 != null && node1.isArray() && node2 == null) {
            for (int i = 0; i < node1.size(); i++) {
                String newPath = path + "[" + i + "]";
                JsonNode childNode = compareJsonNodes(node1.get(i), null, newPath, nodeKey + "[" + i + "]");
                children.add(childNode);
            }
        }
        // ditto
        else if (node1 == null && node2 != null && node2.isArray()) {
            for (int i = 0; i < node2.size(); i++) {
                String newPath = path + "[" + i + "]";
                JsonNode childNode = compareJsonNodes(null, node2.get(i), newPath, nodeKey + "[" + i + "]");
                children.add(childNode);
            }
        }

        // Populate result node
        resultNode.put("key", nodeKey);
        resultNode.put("path", path);
        resultNode.put("type", changeType);


        resultNode.set("value1", node1 != null && !node1.isMissingNode() ? node1 : null);
        resultNode.set("value2", node2 != null && !node2.isMissingNode() ? node2 : null);
        if (!children.isEmpty()) {
            resultNode.set("children", children);
        }

        return resultNode;
    }

    private static boolean isSimilar(JsonNode node1, JsonNode node2) {
        // Check if both nodes are objects
        if (node1.isObject() && node2.isObject()) {
            Set<String> fields1 = new HashSet<>();
            node1.fieldNames().forEachRemaining(fields1::add);

            Set<String> fields2 = new HashSet<>();
            node2.fieldNames().forEachRemaining(fields2::add);

            // If both objects have the same fields, consider them similar
            return fields1.equals(fields2);
        }
        return false;
    }

    // Check if a list contains a node with the same structure and value
    private static boolean containsNode(List<JsonNode> list, JsonNode target) {
        for (JsonNode node : list) {
            if (isSimilar(node, target)) {
                return true;
            }
        }
        return false;

    }
}