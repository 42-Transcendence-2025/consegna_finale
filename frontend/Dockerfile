FROM python:3.11-alpine

# Set the working directory
WORKDIR /app

# Copy all files from the current directory to /app in the container
COPY . /app

# Ensure the run.sh script is executable
RUN chmod +x run.sh

# Run the application
CMD ["sh", "run.sh"]