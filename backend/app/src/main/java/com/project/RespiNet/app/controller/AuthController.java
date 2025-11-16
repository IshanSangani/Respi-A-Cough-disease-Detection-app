package com.project.RespiNet.app.controller;

import com.project.RespiNet.app.models.User;
import com.project.RespiNet.app.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody User user) {
        String token = authService.register(user);
        return ResponseEntity.ok(Collections.singletonMap("token", token));
    }


    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody User user) {
        String token = authService.login(user);
        return ResponseEntity.ok(Collections.singletonMap("token", token));
    }


}
