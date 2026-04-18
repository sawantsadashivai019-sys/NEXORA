from google import genai

genai_client = genai.Client(api_key="AIzaSyBnwTS0ySG_8z7F9q7SN89wORoqG49G84c")

print("My files:")
for f in genai_client.files.list():
    print(" ", f.name)
