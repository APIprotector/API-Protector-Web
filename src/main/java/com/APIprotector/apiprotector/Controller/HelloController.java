package com.APIprotector.apiprotector.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hello")
public class HelloController {
    public HelloController() {
    }

    @GetMapping
    public String getHello() {
        return "Hewwo, Wowd :3";
    }
}
