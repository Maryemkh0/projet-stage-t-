package com.codix.cicdai.cicd_ai_app.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Redirect root (/) to the client UI page.
 */
@Controller
public class HomeController {
    @GetMapping("/")
    public String home() {
        return "redirect:/clients.html";
    }
}
