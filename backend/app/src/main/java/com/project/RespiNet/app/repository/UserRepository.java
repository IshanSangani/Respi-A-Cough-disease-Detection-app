package com.project.RespiNet.app.repository;


import com.project.RespiNet.app.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User,Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

}
