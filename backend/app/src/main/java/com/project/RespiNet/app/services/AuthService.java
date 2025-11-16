package com.project.RespiNet.app.services;

import com.project.RespiNet.app.models.User;
import com.project.RespiNet.app.repository.UserRepository;
import com.project.RespiNet.app.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    @Autowired
    UserRepository userRepository;

    @Autowired
    JwtUtil jwtUtil;

    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public String register(User user) {
            if(userRepository.existsByEmail(user.getEmail())){
                throw new RuntimeException("Email already in use");
            }
            user.setPassword(encoder.encode(user.getPassword()));
            userRepository.save(user);
            return jwtUtil.generateToken(user.getEmail());
    }


    public String login(User loginUser) {
        User user = userRepository.findByEmail(loginUser.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if(!encoder.matches(loginUser.getPassword(), user.getPassword())){
            throw new RuntimeException("Invalid credentials");
        }
        return jwtUtil.generateToken(user.getEmail());
    }
}
