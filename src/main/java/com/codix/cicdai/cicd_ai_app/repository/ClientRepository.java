package com.codix.cicdai.cicd_ai_app.repository;

import com.codix.cicdai.cicd_ai_app.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
}
