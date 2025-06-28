import os
import json
import time
import uuid
from flask import Flask, render_template, jsonify, request

# --- 配置 ---
app = Flask(__name__)
DATA_FILE = "gists.json"

# --- 帮助函数 (数据处理) ---

def load_gists():
    """从 gists.json 文件加载数据"""
    if not os.path.exists(DATA_FILE):
        return []
    # 如果文件是空的，也返回空列表，防止json解析错误
    if os.path.getsize(DATA_FILE) == 0:
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_gists(gists):
    """将数据保存到 gists.json 文件"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        # 使用 ensure_ascii=False 来正确处理中文字符
        json.dump(gists, f, indent=4, ensure_ascii=False)

# --- 主页和 API 路由 (保持不变) ---

@app.route('/')
def index():
    """渲染主页面"""
    return render_template('index.html')

@app.route('/api/gists', methods=['GET'])
def get_gists():
    """获取所有 gists，并按更新时间降序排序"""
    gists = load_gists()
    sorted_gists = sorted(
        gists, 
        key=lambda x: x.get('updated_at', x.get('created_at', 0)), 
        reverse=True
    )
    return jsonify(sorted_gists)

@app.route('/api/gists', methods=['POST'])
def create_gist():
    """创建一个新的 gist"""
    data = request.json
    if not data or 'content' not in data or 'description' not in data:
        return jsonify({"error": "描述和内容是必填项"}), 400
    gists = load_gists()
    current_time = time.time()
    new_gist = {
        'id': str(uuid.uuid4()),
        'description': data['description'],
        'filename': data.get('filename', 'untitled'),
        'content': data['content'],
        'created_at': current_time,
        'updated_at': current_time
    }
    gists.append(new_gist)
    save_gists(gists)
    return jsonify(new_gist), 201

@app.route('/api/gists/<gist_id>', methods=['PUT'])
def update_gist(gist_id):
    """根据 ID 更新一个 gist"""
    gists = load_gists()
    gist_to_update = next((gist for gist in gists if gist['id'] == gist_id), None)
    if not gist_to_update:
        return jsonify({"error": "Gist not found"}), 404
    data = request.json
    gist_to_update['description'] = data.get('description', gist_to_update['description'])
    gist_to_update['filename'] = data.get('filename', gist_to_update['filename'])
    gist_to_update['content'] = data.get('content', gist_to_update['content'])
    gist_to_update['updated_at'] = time.time()
    save_gists(gists)
    return jsonify(gist_to_update)

@app.route('/api/gists/<gist_id>', methods=['DELETE'])
def delete_gist(gist_id):
    """根据 ID 删除一个 gist"""
    gists = load_gists()
    gists_to_keep = [gist for gist in gists if gist['id'] != gist_id]
    if len(gists) == len(gists_to_keep):
        return jsonify({"error": "Gist not found"}), 404
    save_gists(gists_to_keep)
    return jsonify({"message": "删除成功"}), 200

# --- 核心新增功能：单个 Gist 详情页的路由 ---
@app.route('/gist/<gist_id>')
def view_gist(gist_id):
    """渲染单个 Gist 的详情页面"""
    gists = load_gists()
    # 使用 next() 和生成器表达式高效地查找第一个匹配项
    gist_to_view = next((gist for gist in gists if gist.get('id') == gist_id), None)
    
    if gist_to_view is None:
        # 如果找不到，可以返回一个 404 页面或简单的错误信息
        return "Gist not found", 404
        
    # 渲染一个新的模板，并把找到的 gist 数据作为变量传过去
    return render_template('gist_page.html', gist=gist_to_view)


# --- 启动应用 ---

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5072, debug=True)