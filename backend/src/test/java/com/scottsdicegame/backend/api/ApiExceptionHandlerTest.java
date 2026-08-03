package com.scottsdicegame.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void rendersAnApiExceptionAsProblemDetails() {
        ProblemDetail problem = handler.handleApiException(new ApiException(
                HttpStatus.CONFLICT,
                "USERNAME_TAKEN",
                "That username is already taken."
        ));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problem.getTitle()).isEqualTo("Conflict");
        assertThat(problem.getDetail()).isEqualTo("That username is already taken.");
        assertThat(problem.getProperties()).containsEntry("code", "USERNAME_TAKEN");
    }

    @Test
    void rendersTheFirstValidationMessageForEachInvalidField() {
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(
                new FieldError("request", "username", "Username is required."),
                new FieldError("request", "username", "Username has another problem."),
                new FieldError("request", "password", "Password is too weak.")
        ));

        ProblemDetail problem = handler.handleValidation(exception);

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problem.getTitle()).isEqualTo("Invalid request");
        assertThat(problem.getProperties()).containsEntry("code", "VALIDATION_FAILED");
        assertThat(problem.getProperties())
                .containsEntry("errors", Map.of(
                        "username", "Username is required.",
                        "password", "Password is too weak."
                ));
    }
}
