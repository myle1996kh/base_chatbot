flowchart TD
    A(Start) --> B(Phát hiện định dạng file)
    B --> |.pdf| C[Load PDF\n- một Document mỗi trang\n- làm sạch caption hình ảnh]
    B --> |.docx| D[Load DOCX\n- nhận diện Heading\n- gộp nhiều paragraph]
    B --> |.txt| E[Load TXT\n- tách đoạn theo xuống dòng]
    C --> F[Chunk nội dung bằng\nRecursiveCharacterTextSplitter]
    D --> F
    E --> F
    F --> G[Thêm metadata\n(tenant_id, timestamp,\nsection info)]
    G --> H[Lưu vào Vector DB (PGVector)]
    %% Ghi chú về vấn đề
    classDef issue fill:#ffe6e6,stroke:#ff5c5c,color:#d60c0c;
    I[Problemi: Không truy vấn được dữ liệu,\nKết quả truy vấn không liên quan]:::issue
    H --> I
