# Use an official Python runtime as a parent image
FROM nginx:alpine

# Remove crappy default file
RUN rm /etc/nginx/conf.d/default.conf

# Set the working directory to /app
WORKDIR /app

# Chuck requirements in first so we don't need to re-run Pip every time
COPY ./app.conf /etc/nginx/conf.d/

# Copy the current directory contents into the container at /app
COPY ./app /app

# Make port 80 available to the world outside this container
EXPOSE 80
