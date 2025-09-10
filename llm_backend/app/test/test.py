from neo4j import GraphDatabase


NEO4J_URI="bolt://localhost"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="12345678"  # 这里替换成自己设置的密码
NEO4J_DATABASE="neo4j"         # 社区版仅能使用默认的neo4j数据库，不支持创建其他数据库

driver = GraphDatabase.driver(
    NEO4J_URI, 
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

driver = GraphDatabase.driver(
    NEO4J_URI, 
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

def test_connection():
    # 在这里创建会话
    with driver.session() as session:
        session.run("MATCH (n) RETURN n LIMIT 1")

try:
    test_connection()
    print("连接成功！")
except Exception as e:
    print("连接失败:", e)
finally:
    driver.close()  # 确保在所有操作完成后再关闭驱动程序