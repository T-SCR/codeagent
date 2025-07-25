import os
from mistralai.client import MistralClient

api_key = os.environ.get('MISTRAL_API_KEY')
client = MistralClient(api_key=api_key)

# Create a new library (or get an existing one)
library = client.libraries.create(name="My Knowledge Base", description="All my important files")
print("Library ID:", library.id)

FILES_DIR = os.path.abspath('files')
for filename in os.listdir(FILES_DIR):
    if filename.endswith('.pdf') or filename.endswith('.xlsx'):
        file_path = os.path.join(FILES_DIR, filename)
        with open(file_path, 'rb') as file_content:
            uploaded_doc = client.libraries.documents.upload(
                library_id=library.id,
                file=file_content,
                file_name=filename
            )
            print(f'Uploaded: {filename} as {uploaded_doc.id}') 