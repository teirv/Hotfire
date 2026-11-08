FROM mcr.microsoft.com/dotnet/sdk:8.0
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 PYTHONUNBUFFERED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev python3 procps curl ca-certificates \
 && curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path \
 && chmod -R a+rX /usr/local/rustup /usr/local/cargo \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY runner.py .
EXPOSE 8100
HEALTHCHECK --interval=30s --timeout=5s CMD python3 -c "import urllib.request as u;u.urlopen('http://127.0.0.1:8100/healthz')"
CMD ["python3", "runner.py"]
