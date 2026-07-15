package com.codix.cicdai.cicd_ai_app;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String sayHello() {
        return "Bonjour depuis mon pipeline CI/CD intelligent !";
    }
}