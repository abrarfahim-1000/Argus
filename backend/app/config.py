from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    llm_provider: str = "openrouter"
    openrouter_api_key: str = ""
    google_api_key: str = ""

    database_url: str = ""
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    environment: str = "development"


settings = Settings()
