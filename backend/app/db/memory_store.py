"""
In-Memory Asynchronous Database Store for TerraQuest.
Provides a zero-dependency, in-memory collection interface matching the repository contracts.
Eliminates any requirement for external MongoDB, MongoDB Atlas, or network database servers.
"""

import copy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union


class InMemoryCursor:
    """Simulates an asynchronous MongoDB cursor with sort, skip, limit, and to_list."""

    def __init__(self, docs: List[Dict[str, Any]]) -> None:
        self._docs = docs
        self._skip = 0
        self._limit: Optional[int] = None

    def sort(self, key_or_list: Union[str, List], direction: int = 1) -> "InMemoryCursor":
        sort_key = key_or_list if isinstance(key_or_list, str) else key_or_list[0][0]
        sort_dir = direction if isinstance(key_or_list, str) else key_or_list[0][1]
        reverse = sort_dir == -1

        def sort_val(d: Dict[str, Any]) -> Any:
            v = d.get(sort_key)
            if v is None:
                return ""
            if isinstance(v, datetime):
                return v.timestamp()
            return str(v)

        self._docs.sort(key=sort_val, reverse=reverse)
        return self

    def skip(self, count: int) -> "InMemoryCursor":
        self._skip = count
        return self

    def limit(self, count: int) -> "InMemoryCursor":
        self._limit = count
        return self

    def _get_sliced_docs(self) -> List[Dict[str, Any]]:
        start = self._skip
        end = start + self._limit if self._limit is not None else None
        return self._docs[start:end] if end is not None else self._docs[start:]

    def __aiter__(self):
        self._iter = iter(self._get_sliced_docs())
        return self

    async def __anext__(self):
        try:
            return copy.deepcopy(next(self._iter))
        except StopIteration:
            raise StopAsyncIteration

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        sliced = self._get_sliced_docs()
        if length is not None:
            sliced = sliced[:length]
        return [copy.deepcopy(d) for d in sliced]


def _match_filter(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    """Matches a document against basic query operators ($eq, $in, $ne, $exists, etc.)."""
    if not query:
        return True

    for key, value in query.items():
        if key.startswith("$"):
            # Logical operators like $or, $and
            if key == "$or" and isinstance(value, list):
                if not any(_match_filter(doc, sub) for sub in value):
                    return False
            elif key == "$and" and isinstance(value, list):
                if not all(_match_filter(doc, sub) for sub in value):
                    return False
            continue

        doc_val = doc.get(key)
        if isinstance(value, dict):
            for op, target in value.items():
                if op == "$eq" and doc_val != target:
                    return False
                elif op == "$ne" and doc_val == target:
                    return False
                elif op == "$in" and doc_val not in target:
                    return False
                elif op == "$nin" and doc_val in target:
                    return False
                elif op == "$gt" and (doc_val is None or doc_val <= target):
                    return False
                elif op == "$gte" and (doc_val is None or doc_val < target):
                    return False
                elif op == "$lt" and (doc_val is None or doc_val >= target):
                    return False
                elif op == "$lte" and (doc_val is None or doc_val > target):
                    return False
                elif op == "$exists":
                    if target and key not in doc:
                        return False
                    elif not target and key in doc:
                        return False
        else:
            if doc_val != value:
                return False

    return True


def _apply_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Applies MongoDB-like update operations ($set, $inc, $push, $addToSet)."""
    if "$set" in update:
        for k, v in update["$set"].items():
            doc[k] = copy.deepcopy(v)

    if "$inc" in update:
        for k, v in update["$inc"].items():
            doc[k] = doc.get(k, 0) + v

    if "$addToSet" in update:
        for k, v in update["$addToSet"].items():
            current_list = doc.setdefault(k, [])
            if v not in current_list:
                current_list.append(copy.deepcopy(v))

    if "$push" in update:
        for k, v in update["$push"].items():
            current_list = doc.setdefault(k, [])
            current_list.append(copy.deepcopy(v))

    return doc


class InMemoryCollection:
    """In-memory collection store for document operations."""

    def __init__(self, name: str) -> None:
        self.name = name
        self._data: List[Dict[str, Any]] = []

    async def insert_one(self, doc: Dict[str, Any]) -> Any:
        cloned = copy.deepcopy(doc)
        if "_id" not in cloned and "id" in cloned:
            cloned["_id"] = cloned["id"]
        self._data.append(cloned)
        return type("InsertOneResult", (), {"inserted_id": cloned.get("_id")})()

    async def insert_many(self, docs: List[Dict[str, Any]]) -> Any:
        for d in docs:
            await self.insert_one(d)
        return type("InsertManyResult", (), {"inserted_ids": [d.get("id") for d in docs]})()

    async def find_one(
        self,
        query: Optional[Dict[str, Any]] = None,
        sort: Optional[Any] = None,
        *args: Any,
        **kwargs: Any,
    ) -> Optional[Dict[str, Any]]:
        query = query or {}
        matches = [d for d in self._data if _match_filter(d, query)]
        if not matches:
            return None
        if sort:
            cursor = InMemoryCursor(matches)
            cursor.sort(sort)
            matches = cursor._docs
        return copy.deepcopy(matches[0])


    def find(self, query: Optional[Dict[str, Any]] = None) -> InMemoryCursor:
        query = query or {}
        matches = [d for d in self._data if _match_filter(d, query)]
        return InMemoryCursor(matches)

    async def find_one_and_update(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        return_document: bool = True,
        upsert: bool = False,
    ) -> Optional[Dict[str, Any]]:
        for i, d in enumerate(self._data):
            if _match_filter(d, query):
                _apply_update(d, update)
                return copy.deepcopy(d)

        if upsert:
            new_doc = copy.deepcopy(query)
            _apply_update(new_doc, update)
            self._data.append(new_doc)
            return copy.deepcopy(new_doc)

        return None

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> Any:
        res = await self.find_one_and_update(query, update, upsert=upsert)
        return type("UpdateResult", (), {"matched_count": 1 if res else 0, "modified_count": 1 if res else 0})()

    async def delete_one(self, query: Dict[str, Any]) -> Any:
        for i, d in enumerate(self._data):
            if _match_filter(d, query):
                del self._data[i]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    async def delete_many(self, query: Dict[str, Any]) -> Any:
        count = 0
        rem = []
        for d in self._data:
            if _match_filter(d, query):
                count += 1
            else:
                rem.append(d)
        self._data = rem
        return type("DeleteResult", (), {"deleted_count": count})()

    async def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        query = query or {}
        return sum(1 for d in self._data if _match_filter(d, query))

    async def distinct(self, key: str, query: Optional[Dict[str, Any]] = None) -> List[Any]:
        query = query or {}
        vals = set()
        for d in self._data:
            if _match_filter(d, query) and key in d:
                vals.add(d[key])
        return list(vals)

    async def create_index(self, *args: Any, **kwargs: Any) -> str:
        return "in_memory_index"


class InMemoryDatabase:
    """In-memory database holding collections."""

    def __init__(self) -> None:
        self._collections: Dict[str, InMemoryCollection] = {}

    def __getattr__(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name)
        return self._collections[name]

    def __getitem__(self, name: str) -> InMemoryCollection:
        return self.__getattr__(name)

    @property
    def admin(self) -> Any:
        class AdminCmd:
            async def command(self, cmd: str) -> Dict[str, Any]:
                return {"ok": 1}
        return AdminCmd()


class DatabaseManager:
    """Manages the lifecycle of the in-memory database."""

    def __init__(self) -> None:
        self._db = InMemoryDatabase()

    async def connect(self, *args: Any, **kwargs: Any) -> None:
        """In-memory database is immediately available; no network connection required."""
        pass

    async def disconnect(self) -> None:
        """No teardown needed."""
        pass

    async def ping(self) -> bool:
        """Always healthy since it's local in-memory."""
        return True

    def get_database(self) -> InMemoryDatabase:
        return self._db

    def set_override_database(self, db: Any) -> None:
        pass

    def clear_override(self) -> None:
        pass


# Global singleton database manager instance
db_manager = DatabaseManager()


def get_db() -> InMemoryDatabase:
    return db_manager.get_database()
